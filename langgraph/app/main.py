import logging

import httpx
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers.document_router import router as document_router
from app.routers.financial_router import router as financial_router
from app.routers.financial_metrics_router import router as financial_metrics_router
from app.routers.comparison_router import router as comparison_router
from app.routers.memo_router import router as memo_router
from app.routers.chat_router import router as chat_router

logging.basicConfig(level=getattr(logging, settings.log_level.upper(), logging.INFO))
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Venorse Agent Service",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(document_router, prefix="/api")
app.include_router(financial_router, prefix="/api")
app.include_router(financial_metrics_router, prefix="/api")
app.include_router(comparison_router, prefix="/api")
app.include_router(memo_router, prefix="/api")
app.include_router(chat_router, prefix="/api")


@app.on_event("startup")
async def validate_embeddings():
    if not settings.jina_api_key:
        logger.warning("JINA_API_KEY is not set — vector store operations will fail. Set it in langgraph/.env")
        return
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(
                "https://api.jina.ai/v1/embeddings",
                headers={
                    "Authorization": f"Bearer {settings.jina_api_key}",
                    "Content-Type": "application/json",
                },
                json={"model": "jina-embeddings-v3", "input": "ping"},
            )
            if resp.status_code == 200:
                logger.info("Jina Embeddings API is reachable and authenticated")
            else:
                logger.warning("Jina Embeddings API returned %d: %s", resp.status_code, resp.text[:200])
    except Exception as e:
        logger.warning("Jina Embeddings API unreachable at startup: %s", e)


@app.get("/api/health")
async def health():
    return {"status": "ok"}


if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host=settings.agent_host,
        port=settings.agent_port,
        reload=True,
    )
