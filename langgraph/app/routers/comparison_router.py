import logging

from fastapi import APIRouter

from app.schemas import ComparisonRequest, ComparisonResponse
from app.agents.comparison_agent import run_comparison_agent

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/compare", response_model=ComparisonResponse)
async def compare(req: ComparisonRequest):
    result = await run_comparison_agent(req.companyIds)
    return ComparisonResponse(
        comparison_result=result.get("comparison_result", ""),
    )
