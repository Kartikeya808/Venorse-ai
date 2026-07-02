import logging
import time
from pathlib import Path
from typing import Optional

import httpx
import chromadb
from chromadb import EmbeddingFunction
from chromadb.config import Settings as ChromaSettings
from sklearn.feature_extraction.text import HashingVectorizer

from app.config import settings

logger = logging.getLogger(__name__)


# ── Gemini Embedding Function (hosted API, no local ML model) ──

class GeminiEmbeddingFunction(EmbeddingFunction):
    """ChromaDB embedding function using the Gemini Embedding API.

    Calls gemini-embedding-001 via Google's batchEmbedContents endpoint.
    Produces 768-dim vectors. Zero local memory for ML model.
    Requires GEMINI_API_KEY set in environment.
    """

    def __init__(self, api_key: str, model: str = "gemini-embedding-001"):
        self._api_key = api_key
        self._model = f"models/{model}"
        self._url = (
            f"https://generativelanguage.googleapis.com/v1beta/"
            f"{self._model}:batchEmbedContents"
        )

    def __call__(self, input):
        texts = input if isinstance(input, list) else [input]
        body = {
            "requests": [
                {"model": self._model, "content": {"parts": [{"text": t}]}}
                for t in texts
            ]
        }
        params = {"key": self._api_key}
        resp = httpx.post(self._url, params=params, json=body, timeout=30)
        if resp.status_code == 429:
            logger.warning("Gemini rate limited (429), retrying after 2s")
            time.sleep(2)
            resp = httpx.post(self._url, params=params, json=body, timeout=30)
        resp.raise_for_status()
        return [e["values"] for e in resp.json()["embeddings"]]


# ── Lightweight embedding function (no ML model, runs on 512MB) ──

class TfidfEmbeddingFunction(EmbeddingFunction):
    """ChromaDB embedding function using HashingVectorizer + L2 norm.

    Produces 512-dim unit vectors without loading any ML model.
    Compatible with ChromaDB's cosine HNSW index.
    ~5MB memory, no disk download, no API calls.
    Upgrade path: swap to ONNXMiniLM_L6_V2 on a paid Render tier.
    """

    def __init__(self):
        self._vectorizer = HashingVectorizer(
            n_features=512,
            norm="l2",
            alternate_sign=False,
        )

    def __call__(self, input):
        texts = input if isinstance(input, list) else [input]
        return self._vectorizer.transform(texts).toarray().tolist()


_ef = None


def _get_ef():
    global _ef
    if _ef is None:
        if settings.gemini_api_key:
            logger.info("Initializing GeminiEmbeddingFunction (768-dim, hosted API)")
            _ef = GeminiEmbeddingFunction(api_key=settings.gemini_api_key)
        else:
            logger.info("Initializing TfidfEmbeddingFunction (512-dim, no model download)")
            _ef = TfidfEmbeddingFunction()
    return _ef


# ── ChromaDB persistence layer ──

def get_chroma_client() -> chromadb.ClientAPI:
    persist_dir = Path(settings.chroma_persist_dir)
    persist_dir.mkdir(parents=True, exist_ok=True)
    return chromadb.PersistentClient(
        path=str(persist_dir),
        settings=ChromaSettings(anonymized_telemetry=False),
    )


def get_or_create_collection(client: Optional[chromadb.ClientAPI] = None):
    if client is None:
        client = get_chroma_client()
    return client.get_or_create_collection(
        name=settings.chroma_collection,
        metadata={"hnsw:space": "cosine"},
        embedding_function=_get_ef(),
    )


def add_document_chunks(chunks: list[str], metadata: list[dict], doc_id: str):
    collection = get_or_create_collection()
    ids = [f"{doc_id}_{i}" for i in range(len(chunks))]
    try:
        collection.add(
            ids=ids,
            documents=chunks,
            metadatas=metadata,
        )
        logger.info("Stored %d chunks for document %s", len(chunks), doc_id)
    except chromadb.errors.ChromaError as e:
        if "dimensionality" in str(e).lower() or "dimension" in str(e).lower():
            logger.warning("Dimension mismatch, recreating collection: %s", e)
            client = get_chroma_client()
            client.delete_collection(settings.chroma_collection)
            collection = get_or_create_collection()
            collection.add(ids=ids, documents=chunks, metadatas=metadata)
            logger.info("Stored %d chunks after recreating collection", len(chunks))
        else:
            raise


def search(query: str, top_k: int = 5, filters: Optional[dict] = None) -> list[dict]:
    collection = get_or_create_collection()
    where = filters or {}
    results = collection.query(
        query_texts=[query],
        n_results=top_k,
        where=where or None,
    )
    documents = []
    if results["documents"] and results["documents"][0]:
        for i, doc in enumerate(results["documents"][0]):
            documents.append({
                "content": doc,
                "metadata": results["metadatas"][0][i] if results["metadatas"] else {},
                "score": results["distances"][0][i] if results["distances"] else 0,
            })
    return documents


def delete_document_chunks(doc_id: str):
    collection = get_or_create_collection()
    existing = collection.get(where={"doc_id": doc_id})
    if existing["ids"]:
        collection.delete(ids=existing["ids"])
        logger.info("Deleted %d chunks for document %s", len(existing["ids"]), doc_id)
