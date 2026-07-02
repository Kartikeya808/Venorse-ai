import logging
import traceback

from fastapi import APIRouter, HTTPException

from app.schemas import ProcessDocumentRequest, ProcessDocumentResponse
from app.agents.document_agent import run_document_agent

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/process-document", response_model=ProcessDocumentResponse)
async def process_document(req: ProcessDocumentRequest):
    try:
        result = await run_document_agent(req.documentId, req.fileContent, req.fileName)
        logger.info("process-document completed for %s: %d chunks, %d chars summary",
                     req.documentId, len(result.get("chunks", [])), len(result.get("summary", "")))
        return ProcessDocumentResponse(
            document_id=req.documentId,
            summary=result.get("summary", ""),
            chunks=result.get("chunks", []),
        )
    except Exception:
        logger.exception("process-document crashed for %s", req.documentId)
        raise HTTPException(status_code=500, detail="Document processing failed")
