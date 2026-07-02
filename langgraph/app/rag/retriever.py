import logging
from typing import Optional

from app.rag.vector_store import get_or_create_collection, embed_texts

logger = logging.getLogger(__name__)


def search(query: str, top_k: int = 5, filters: Optional[dict] = None) -> list[dict]:
    collection = get_or_create_collection()
    query_embedding = embed_texts([query])[0]

    where = filters or {}

    results = collection.query(
        query_embeddings=[query_embedding],
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


def format_context(documents: list[dict], max_chars: int = 8000) -> str:
    parts = []
    chars = 0
    for doc in documents:
        snippet = doc["content"][:2000]
        if chars + len(snippet) > max_chars:
            break
        parts.append(f"[Source: {doc['metadata'].get('page', '?')}] {snippet}")
        chars += len(snippet)
    return "\n\n".join(parts)
