import logging
from typing import TypedDict

from langgraph.graph import StateGraph, END
from app.rag.retriever import search, format_context
from app.utils.llm import call_llm

logger = logging.getLogger(__name__)


class FinancialState(TypedDict):
    company_id: str
    company_name: str
    context: str
    analysis_result: str
    error: str


def retrieve_node(state: FinancialState) -> dict:
    try:
        name = state.get("company_name") or state.get("company_id", "")
        doc_id = state.get("company_id", "")
        docs = search(
            f"{name} financial analysis revenue income balance sheet cash flow margins growth",
            top_k=30,
            filters={"doc_id": doc_id} if doc_id else None,
        )
        context = format_context(docs, max_chars=15000)
        return {"context": context, "error": ""}
    except Exception as e:
        logger.warning("Retrieval failed (%s), proceeding without context", e)
        return {"context": "", "error": ""}


def analyze_node(state: FinancialState) -> dict:
    system = (
        "IMPORTANT: Answer directly without step-by-step reasoning. Be concise.\n\n"
        "You are a financial analyst. Analyze the company's financial health based on the provided data. "
        "Cover: revenue, margins, debt, cash flow, growth rates, and key ratios. "
        "Provide specific numbers where available. Be concise and data-driven."
    )
    user = f"Company: {state.get('company_name', state['company_id'])}\n\n"
    if state["context"]:
        user += f"Context:\n{state['context']}\n\n"
    user += "Provide a comprehensive financial analysis."
    result = call_llm(system, user)
    return {"analysis_result": result}


def build_financial_graph():
    graph = StateGraph(FinancialState)
    graph.add_node("retrieve", retrieve_node)
    graph.add_node("analyze", analyze_node)
    graph.set_entry_point("retrieve")
    graph.add_edge("retrieve", "analyze")
    graph.add_edge("analyze", END)
    return graph.compile()


financial_graph = build_financial_graph()


async def run_financial_agent(company_id: str, company_name: str = "") -> dict:
    result = await financial_graph.ainvoke({
        "company_id": company_id,
        "company_name": company_name,
        "context": "",
        "analysis_result": "",
        "error": "",
    })
    return result
