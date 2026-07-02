import logging
from typing import TypedDict

from langgraph.graph import StateGraph, END
from app.rag.retriever import search, format_context
from app.utils.llm import call_llm

logger = logging.getLogger(__name__)


class ComparisonState(TypedDict):
    company_ids: list[str]
    company_names: list[str]
    contexts: list[str]
    comparison_result: str
    error: str


def retrieve_node(state: ComparisonState) -> dict:
    contexts = []
    names = state.get("company_names") or state["company_ids"]
    for i, cid in enumerate(state["company_ids"]):
        try:
            name = names[i] if i < len(names) else cid
            docs = search(f"financial data for {name}", top_k=5)
            ctx = format_context(docs, max_chars=3000)
            contexts.append(f"=== {name} ===\n{ctx}")
        except Exception as e:
            logger.warning("Retrieval failed for %s: %s", cid, e)
            contexts.append(f"=== {names[i] if i < len(names) else cid} ===\nNo context available")
    return {"contexts": contexts, "error": ""}


def compare_node(state: ComparisonState) -> dict:
    system = (
        "You are a financial comparison analyst. Compare the companies across these dimensions: "
        "revenue growth, profitability margins, debt levels, cash flow generation, and efficiency ratios. "
        "Highlight which company leads in each category and provide a summary verdict."
    )
    user = "Compare the following companies:\n\n" + "\n\n".join(state["contexts"])
    result = call_llm(system, user)
    return {"comparison_result": result}


def build_comparison_graph():
    graph = StateGraph(ComparisonState)
    graph.add_node("retrieve", retrieve_node)
    graph.add_node("compare", compare_node)
    graph.set_entry_point("retrieve")
    graph.add_edge("retrieve", "compare")
    graph.add_edge("compare", END)
    return graph.compile()


comparison_graph = build_comparison_graph()


async def run_comparison_agent(company_ids: list[str], company_names: list[str] | None = None) -> dict:
    if company_names is None:
        company_names = company_ids
    result = await comparison_graph.ainvoke({
        "company_ids": company_ids,
        "company_names": company_names,
        "contexts": [],
        "comparison_result": "",
        "error": "",
    })
    return result
