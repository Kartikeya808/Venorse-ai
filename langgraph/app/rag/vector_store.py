import logging
import time
from pathlib import Path
from typing import Optional

import httpx
import chromadb
from chromadb import EmbeddingFunction
from chromadb.config import Settings as ChromaSettings
from app.config import settings

logger = logging.getLogger(__name__)


# ── Jina Embedding Function (hosted API, no local ML model) ──

class JinaEmbeddingFunction(EmbeddingFunction):
    """ChromaDB embedding function using the Jina Embeddings API.

    Calls jina-embeddings-v3 via Jina's OpenAI-compatible /v1/embeddings.
    Produces 1024-dim vectors. Zero local memory for ML model.
    Requires JINA_API_KEY set in environment.
    """

    def __init__(self, api_key: str, model: str = "jina-embeddings-v3"):
        self._api_key = api_key
        self._model = model

    def __call__(self, input):
        texts = input if isinstance(input, list) else [input]
        resp = httpx.post(
            "https://api.jina.ai/v1/embeddings",
            headers={
                "Authorization": f"Bearer {self._api_key}",
                "Content-Type": "application/json",
            },
            json={"model": self._model, "input": texts},
            timeout=30,
        )
        resp.raise_for_status()
        return [e["embedding"] for e in resp.json()["data"]]


_ef = None


def _get_ef():
    global _ef
    if _ef is None:
        if not settings.jina_api_key:
            raise ValueError(
                "JINA_API_KEY is required but not set. "
                "Add JINA_API_KEY=your-key to langgraph/.env"
            )
        logger.info("Initializing JinaEmbeddingFunction (1024-dim, hosted API)")
        _ef = JinaEmbeddingFunction(api_key=settings.jina_api_key)
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
