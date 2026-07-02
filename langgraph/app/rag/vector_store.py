import logging
from pathlib import Path
from typing import Optional

import chromadb
from chromadb.config import Settings as ChromaSettings
from chromadb.utils.embedding_functions import ONNXMiniLM_L6_V2
from app.config import settings

logger = logging.getLogger(__name__)

_ef = None


def _get_ef():
    global _ef
    if _ef is None:
        logger.info("Loading ONNX MiniLM-L6-V2 embedding model (first request may be slow)...")
        _ef = ONNXMiniLM_L6_V2()
        logger.info("Embedding model ready")
    return _ef


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
    collection.add(
        ids=ids,
        documents=chunks,
        metadatas=metadata,
    )
    logger.info("Stored %d chunks for document %s", len(chunks), doc_id)


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
