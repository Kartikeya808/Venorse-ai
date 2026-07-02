import logging

from fastapi import APIRouter

from app.schemas import ProcessDocumentRequest, ProcessDocumentResponse
from app.agents.document_agent import run_document_agent

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/process-document", response_model=ProcessDocumentResponse)
async def process_document(req: ProcessDocumentRequest):
    result = await run_document_agent(req.documentId, req.filePath)
    return ProcessDocumentResponse(
        document_id=req.documentId,
        summary=result.get("summary", ""),
        chunks=result.get("chunks", []),
    )
