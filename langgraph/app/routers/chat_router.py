import logging

from fastapi import APIRouter

from app.schemas import ChatRequest, ChatResponse
from app.agents.chat_agent import run_chat_agent

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    result = await run_chat_agent(req.message, req.history, company_id=req.companyId)
    return ChatResponse(response=result.get("response", ""))
