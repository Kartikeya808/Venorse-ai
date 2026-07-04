import logging
from typing import TypedDict

from langgraph.graph import StateGraph, END
from app.rag.retriever import search, format_context
from app.utils.llm import call_llm

logger = logging.getLogger(__name__)


class ChatState(TypedDict):
    message: str
    history: list[dict]
    context: str
    response: str
    error: str
    company_id: str


def retrieve_node(state: ChatState) -> dict:
    try:
        docs = search(state["message"], top_k=5)
        ctx = format_context(docs, max_chars=4000)
        return {"context": ctx, "error": ""}
    except Exception as e:
        logger.warning("Chat retrieval failed (%s), proceeding without context", e)
        return {"context": "", "error": ""}


def respond_node(state: ChatState) -> dict:
    system = (
        "IMPORTANT: Answer directly without step-by-step reasoning. Be concise.\n\n"
        "You are a financial research assistant specializing in company analysis, "
        "financial statements, valuation, market trends, and investment research. "
        "Answer questions clearly and concisely using financial domain knowledge. "
        "Cite specific data points when possible. If you don't know something, say so."
    )
    user = f"Previous conversation:\n{_format_history(state.get('history', []))}\n\n"
    if state.get("context"):
        user += f"Context from documents:\n{state['context']}\n\n"
    user += f"User: {state['message']}"

    result = call_llm(system, user)
    return {"response": result, "error": ""}


def _format_history(history: list[dict]) -> str:
    lines = []
    for h in history[-6:]:
        role = h.get("role", "user")
        content = h.get("content", "")
        lines.append(f"{role}: {content}")
    return "\n".join(lines)


def build_chat_graph():
    graph = StateGraph(ChatState)
    graph.add_node("retrieve", retrieve_node)
    graph.add_node("respond", respond_node)
    graph.set_entry_point("retrieve")
    graph.add_edge("retrieve", "respond")
    graph.add_edge("respond", END)
    return graph.compile()


chat_graph = build_chat_graph()


async def run_chat_agent(message: str, history: list[dict] = None, company_id: str = "") -> dict:
    result = await chat_graph.ainvoke({
        "message": message,
        "history": history or [],
        "context": "",
        "response": "",
        "error": "",
        "company_id": company_id,
    })
    return result
