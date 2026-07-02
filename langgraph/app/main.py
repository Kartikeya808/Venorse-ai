import logging

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
