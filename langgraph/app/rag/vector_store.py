import logging
from pathlib import Path
from typing import Optional

import chromadb
import httpx
from chromadb.config import Settings as ChromaSettings
from app.config import settings

logger = logging.getLogger(__name__)


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
    )


def embed_texts(texts: list[str]) -> list[list[float]]:
    url = f"{settings.ollama_base_url}/api/embeddings"
    try:
        results = []
        for text in texts:
            resp = httpx.post(
                url,
                json={"model": settings.embedding_model, "prompt": text},
                timeout=30,
            )
            resp.raise_for_status()
            results.append(resp.json()["embedding"])
        return results
    except Exception as e:
        logger.warning("Ollama embedding failed (%s), using fastembed", e)
        return _fastembed_texts(texts)


_fastembed_model = None

def _fastembed_texts(texts: list[str]) -> list[list[float]]:
    global _fastembed_model
    if _fastembed_model is None:
        from fastembed import TextEmbedding
        _fastembed_model = TextEmbedding(model_name="BAAI/bge-small-en-v1.5")
    return list(_fastembed_model.embed(texts))


def add_document_chunks(chunks: list[str], metadata: list[dict], doc_id: str):
    collection = get_or_create_collection()
    ids = [f"{doc_id}_{i}" for i in range(len(chunks))]
    embeddings = embed_texts(chunks)
    collection.add(
        ids=ids,
        documents=chunks,
        metadatas=metadata,
        embeddings=embeddings,
    )
    logger.info("Stored %d chunks for document %s", len(chunks), doc_id)


def delete_document_chunks(doc_id: str):
    collection = get_or_create_collection()
    existing = collection.get(where={"doc_id": doc_id})
    if existing["ids"]:
        collection.delete(ids=existing["ids"])
        logger.info("Deleted %d chunks for document %s", len(existing["ids"]), doc_id)
