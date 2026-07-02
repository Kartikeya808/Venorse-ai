import logging

from fastapi import APIRouter

from app.schemas import FinancialAnalysisRequest, FinancialAnalysisResponse
from app.agents.financial_agent import run_financial_agent

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/financial-analysis", response_model=FinancialAnalysisResponse)
async def financial_analysis(req: FinancialAnalysisRequest):
    result = await run_financial_agent(req.companyId, req.companyName)
    return FinancialAnalysisResponse(
        company_id=req.companyId,
        analysis_result=result.get("analysis_result", ""),
    )
