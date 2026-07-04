import logging

from fastapi import APIRouter

from app.schemas import FinancialMetricsRequest
from app.agents.financial_metrics_agent import run_financial_metrics_agent

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/financial-metrics")
async def financial_metrics(req: FinancialMetricsRequest):
    result = await run_financial_metrics_agent(req.companyId, req.companyName)
    return {
        "company_id": req.companyId,
        "metrics": result.get("metrics", []),
        "analysis_text": result.get("analysis_text", ""),
        "error": result.get("error", ""),
    }
