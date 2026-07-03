import json
import logging
import re
from typing import TypedDict

from langgraph.graph import StateGraph, END
from app.rag.retriever import search, format_context
from app.utils.llm import call_llm

logger = logging.getLogger(__name__)


def _parse_llm_json(raw: str) -> dict | None:
    cleaned = raw.strip()
    cleaned = re.sub(r'^```(?:json)?\s*', '', cleaned)
    cleaned = re.sub(r'\s*```$', '', cleaned)
    cleaned = cleaned.strip()
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        return None


def _fmt_val(value, title: str) -> str:
    try:
        v = float(value)
    except (ValueError, TypeError):
        return str(value)
    t = title.lower()
    if any(kw in t for kw in ("margin", "roe", "roa", "return")):
        return f"{v:.1f}%"
    if "p/e" in t:
        return f"{v:.1f}x"
    if any(kw in t for kw in ("ratio", "debt", "equity")):
        return f"{v:.2f}x"
    if any(kw in t for kw in ("revenue", "income", "cash flow", "fcf")):
        if abs(v) >= 1_000_000_000_000:
            return f"${v/1_000_000_000_000:,.2f}T"
        if abs(v) >= 1_000_000_000:
            return f"${v/1_000_000_000:,.2f}B"
        if abs(v) >= 1_000_000:
            return f"${v/1_000_000:,.2f}M"
        if abs(v) >= 1_000:
            return f"${v/1_000:,.2f}K"
        return f"${v:,.0f}"
    return f"{v:,.1f}"


def _fmt_chg(value, title: str) -> str:
    try:
        v = float(value)
    except (ValueError, TypeError):
        return str(value)
    t = title.lower()
    if any(kw in t for kw in ("ratio", "debt", "equity", "p/e")):
        return f"{v:+.2f}"
    return f"{v:+.1f}%"


class FinancialMetricsState(TypedDict):
    company_id: str
    company_name: str
    context: str
    metrics: list[dict]
    analysis_text: str
    error: str


def retrieve_node(state: FinancialMetricsState) -> dict:
    try:
        name = state.get("company_name") or state.get("company_id", "")
        doc_id = state.get("company_id", "")
        filters = {"doc_id": doc_id} if doc_id else None

        queries = [
            f"{name} revenue net income gross margin operating income",
            f"{name} balance sheet assets debt equity cash",
            f"{name} cash flow operating free cash flow",
        ]
        seen = set()
        combined = []
        for q in queries:
            docs = search(q, top_k=3, filters=filters)
            for d in docs:
                sig = (d["content"][:100], d["metadata"].get("chunk"))
                if sig not in seen:
                    seen.add(sig)
                    combined.append(d)

        context = format_context(combined, max_chars=4000)
        return {"context": context, "error": ""}
    except Exception as e:
        logger.warning("Retrieval failed (%s), proceeding without context", e)
        return {"context": "", "error": ""}


def analyze_node(state: FinancialMetricsState) -> dict:
    system = (
        "Extract financial metrics from Context. Use ONLY numbers written verbatim in Context. "
        "Output ONLY valid JSON, no markdown, no extra text.\n"
        "RULES:\n"
        "- Include a metric only if its exact number appears in Context. Omit others.\n"
        "- value: raw number, no $/,/% (e.g. 143800000000 for $143.8B, 34.5 for 34.5%)\n"
        "- change: stated YoY % if given, else 0\n"
        "- data: [] unless Context has 2+ periods, then [{\"period\":\"\",\"value\":0}]\n"
        "- Max 1 entry per metric\n"
        "- No metrics found -> {\"analysis_text\":\"No financial metrics found.\",\"metrics\":[]}\n"
        "Metrics: Revenue, Gross Margin, Operating Margin, Net Income, Free Cash Flow, "
        "Debt-to-Equity, ROE, P/E Ratio, EPS, Operating Income, EBITDA, Net Profit Margin, "
        "Current Ratio, Return on Assets.\n"
        "Schema: {\"analysis_text\":\"summary\",\"metrics\":["
        "{\"title\":\"\",\"value\":0,\"change\":0,\"trend\":\"up\",\"chartType\":\"area\",\"data\":[{\"value\":0}],"
        "\"explain\":{\"meaning\":\"\",\"formula\":\"\",\"benchmark\":\"\",\"interpretation\":\"\"}}]}"
    )

    name = state.get("company_name") or state.get("company_id", "")
    ctx = state.get("context", "")
    if not ctx.strip():
        return {"metrics": [], "analysis_text": "No financial data found for this document."}
    user = f"Company: {name}\n\nContext:\n{ctx}\n\n"
    user += f"Return JSON for {name} using ONLY numbers from Context above. If no numbers match any metric, return {{\"analysis_text\":\"No metrics found\",\"metrics\":[]}}."

    result = call_llm(system, user, temperature=0.1, max_tokens=3000)

    parsed = _parse_llm_json(result)
    if parsed is None:
        logger.error("LLM returned unparseable JSON for metrics: %s", result[:200])
        raise ValueError("LLM failed to return valid JSON for metrics")

    metrics = parsed.get("metrics", [])
    analysis_text = parsed.get("analysis_text", result)
    validated = []
    for m in metrics:
        if all(k in m for k in ("title", "value", "change", "trend", "chartType", "data", "explain")):
            m["value"] = _fmt_val(m["value"], m["title"])
            m["change"] = _fmt_chg(m["change"], m["title"])
            if "explain" in m:
                for ek in ("meaning", "formula", "benchmark", "interpretation"):
                    if ek in m["explain"]:
                        m["explain"][ek] = str(m["explain"][ek])
                if "value" in m["explain"]:
                    m["explain"]["value"] = _fmt_val(m["explain"]["value"], m["title"])
            validated.append(m)
    if not validated:
        logger.error("LLM returned metrics with missing fields: %s", result[:200])
        raise ValueError("LLM returned invalid metrics structure")

    return {"metrics": validated, "analysis_text": analysis_text}


def build_financial_metrics_graph():
    graph = StateGraph(FinancialMetricsState)
    graph.add_node("retrieve", retrieve_node)
    graph.add_node("analyze", analyze_node)
    graph.set_entry_point("retrieve")
    graph.add_edge("retrieve", "analyze")
    graph.add_edge("analyze", END)
    return graph.compile()


financial_metrics_graph = build_financial_metrics_graph()


async def run_financial_metrics_agent(company_id: str, company_name: str = "") -> dict:
    result = await financial_metrics_graph.ainvoke({
        "company_id": company_id,
        "company_name": company_name,
        "context": "",
        "metrics": [],
        "analysis_text": "",
        "error": "",
    })
    return result
