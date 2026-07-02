import base64
import logging
import os
import tempfile
from typing import TypedDict, Literal

from langgraph.graph import StateGraph, END
from app.rag.chunker import chunk_text
from app.rag.vector_store import add_document_chunks
from app.utils.pdf import extract_text
from app.utils.llm import call_llm

logger = logging.getLogger(__name__)


class DocumentState(TypedDict):
    document_id: str
    file_content: str
    file_name: str
    raw_text: str
    chunks: list[str]
    summary: str
    error: str


def extract_node(state: DocumentState) -> dict:
    tmp = None
    try:
        data = base64.b64decode(state["file_content"])
        _, ext = os.path.splitext(state["file_name"])
        with tempfile.NamedTemporaryFile(suffix=ext or ".bin", delete=False) as f:
            f.write(data)
            tmp = f.name
        text = extract_text(tmp)
        return {"raw_text": text, "error": ""}
    except Exception as e:
        logger.error("Extract failed: %s", e)
        return {"error": str(e)}
    finally:
        if tmp:
            try:
                os.unlink(tmp)
            except Exception:
                pass


def chunk_node(state: DocumentState) -> dict:
    try:
        raw = state["raw_text"]
        logger.info("Chunking %d chars of text", len(raw))
        chunks = []
        chunk_metas = []
        for chunk_text_val, meta in chunk_text(raw):
            chunks.append(chunk_text_val)
            chunk_metas.append({"doc_id": state["document_id"], **meta})

        logger.info("Produced %d chunks", len(chunks))
        if chunks:
            add_document_chunks(chunks, chunk_metas, state["document_id"])
        return {"chunks": chunks}
    except Exception as e:
        logger.error("Chunking failed: %s", e, exc_info=True)
        return {"error": str(e)}


def summarize_node(state: DocumentState) -> dict:
    context = "\n\n".join(state["chunks"][:3]) if state["chunks"] else state["raw_text"][:3000]
    if len(context) > 12000:
        context = context[:12000]
    system = (
        "You are a financial document analyst. Summarize the following document extract. "
        "Return a JSON object with exactly these keys: revenue, risks, growthDrivers, outlook, fullSummary. "
        "Each value must be a string."
    )
    summary = call_llm(system, f"Document extract:\n\n{context}")
    if summary.startswith("[Groq API error:"):
        logger.warning("Summarization failed: %s", summary)
        summary = '{"revenue":"","risks":"","growthDrivers":"","outlook":"","fullSummary":"Document ingested."}'
    return {"summary": summary}


def should_continue(state: DocumentState) -> Literal["chunk", "summarize", "__end__"]:
    if state.get("error"):
        return "__end__"
    if not state.get("raw_text"):
        return "__end__"
    if not state.get("chunks"):
        return "chunk"
    return "summarize"


def build_document_graph():
    graph = StateGraph(DocumentState)

    graph.add_node("extract", extract_node)
    graph.add_node("chunk", chunk_node)
    graph.add_node("summarize", summarize_node)

    graph.set_entry_point("extract")
    graph.add_conditional_edges("extract", should_continue)
    graph.add_edge("chunk", "summarize")
    graph.add_edge("summarize", END)

    return graph.compile()


document_graph = build_document_graph()


async def run_document_agent(document_id: str, file_content: str, file_name: str) -> dict:
    result = await document_graph.ainvoke({
        "document_id": document_id,
        "file_content": file_content,
        "file_name": file_name,
        "raw_text": "",
        "chunks": [],
        "summary": "",
        "error": "",
    })
    return result
