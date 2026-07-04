import logging
from typing import TypedDict, Optional

from langgraph.graph import StateGraph, END
from app.rag.retriever import search, format_context
from app.utils.llm import call_llm

logger = logging.getLogger(__name__)


class MemoState(TypedDict):
    company_id: str
    company_name: str
    options: dict
    context: str
    memo_result: str
    error: str


def retrieve_node(state: MemoState) -> dict:
    try:
        name = state.get("company_name") or state.get("company_id", "")
        doc_id = state.get("company_id", "")
        docs = search(
            f"{name} business overview revenue financials strategy risks competition market",
            top_k=15,
            filters={"doc_id": doc_id} if doc_id else None,
        )
        ctx = format_context(docs, max_chars=8000)
        return {"context": ctx, "error": ""}
    except Exception as e:
        logger.warning("Retrieval failed (%s), proceeding without context", e)
        return {"context": "", "error": ""}


def generate_node(state: MemoState) -> dict:
    system = (
        "You are a sell-side equity research analyst. Generate a professional research memo "
        "with these sections: Executive Summary, Financial Health, Growth Drivers, Risk Factors, "
        "Valuation, Sources. "
        "Return plain text only. Do NOT use any markdown formatting (no **, no ##, no *). "
        "Use plain section headers like 'Executive Summary'. "
        "Use bullet points starting with '- ' for lists. "
        "Separate sections with blank lines."
    )
    user = f"Company: {state.get('company_name', state['company_id'])}\n\n"
    if state["context"]:
        user += f"Research Data:\n{state['context']}\n\n"
    if state.get("options"):
        user += f"Additional instructions: {state['options']}\n\n"
    user += "Generate a comprehensive research memo."
    result = call_llm(system, user, max_tokens=8192)
    return {"memo_result": result}


def build_memo_graph():
    graph = StateGraph(MemoState)
    graph.add_node("retrieve", retrieve_node)
    graph.add_node("generate", generate_node)
    graph.set_entry_point("retrieve")
    graph.add_edge("retrieve", "generate")
    graph.add_edge("generate", END)
    return graph.compile()


memo_graph = build_memo_graph()


async def run_memo_agent(company_id: str, company_name: str = "", options: Optional[dict] = None) -> dict:
    result = await memo_graph.ainvoke({
        "company_id": company_id,
        "company_name": company_name,
        "options": options or {},
        "context": "",
        "memo_result": "",
        "error": "",
    })
    return result
