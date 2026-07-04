import logging
from fastapi import APIRouter
from app.rag.vector_store import search, get_or_create_collection
from app.config import settings

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/debug/collections")
async def debug_collections():
    """Check ChromaDB collections and their contents."""
    try:
        collection = get_or_create_collection()
        count = collection.count()
        return {
            "status": "ok",
            "collection_name": settings.chroma_collection,
            "document_count": count,
            "embedding_model": "jina-embeddings-v3",
        }
    except Exception as e:
        logger.error("Debug collections failed: %s", e)
        return {"error": str(e), "status": "failed"}


@router.post("/debug/search-test")
async def debug_search(query: str, doc_id: str = None, top_k: int = 3):
    """Test vector store search with optional document filter."""
    try:
        filters = {"doc_id": doc_id} if doc_id else None
        results = search(query, top_k=top_k, filters=filters)

        return {
            "query": query,
            "filters": filters,
            "results_count": len(results),
            "results": [
                {
                    "content": r["content"][:200],
                    "metadata": r["metadata"],
                    "score": r["score"],
                }
                for r in results
            ]
        }
    except Exception as e:
        logger.error("Debug search failed: %s", e)
        return {"error": str(e), "status": "failed"}
