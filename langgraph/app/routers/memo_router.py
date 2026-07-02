import logging

from fastapi import APIRouter

from app.schemas import GenerateMemoRequest, GenerateMemoResponse
from app.agents.memo_agent import run_memo_agent

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/generate-memo", response_model=GenerateMemoResponse)
async def generate_memo(req: GenerateMemoRequest):
    result = await run_memo_agent(req.companyId, options=req.options)
    return GenerateMemoResponse(
        memo_result=result.get("memo_result", ""),
    )
