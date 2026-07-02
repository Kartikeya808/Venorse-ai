import logging

from app.rag.vector_store import search

logger = logging.getLogger(__name__)


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
