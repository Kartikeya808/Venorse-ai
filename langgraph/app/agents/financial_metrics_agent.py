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
            f"{name} revenue net income gross margin operating income financial highlights",
            f"{name} balance sheet assets liabilities debt equity cash",
            f"{name} cash flow statement operating investing financing",
            f"{name} income statement earnings per share EBITDA ratios",
        ]
        seen = set()
        combined = []
        for q in queries:
            docs = search(q, top_k=10, filters=filters)
            for d in docs:
                sig = (d["content"][:100], d["metadata"].get("chunk"))
                if sig not in seen:
                    seen.add(sig)
                    combined.append(d)

        context = format_context(combined, max_chars=15000)
        return {"context": context, "error": ""}
    except Exception as e:
        logger.warning("Retrieval failed (%s), proceeding without context", e)
        return {"context": "", "error": ""}


def analyze_node(state: FinancialMetricsState) -> dict:
    system = (
    "You are a precise financial data extraction engine. "
    "You have NO prior knowledge of any company. "
    "Every number you output MUST be copied verbatim from the Context below. "
    "If a number is not in the Context, you MUST omit the metric.\n\n"
    "Return ONLY valid JSON with no other text before or after. "
    "Do not wrap in markdown code blocks.\n\n"
    "Schema:\n"
    '{"analysis_text": "2-3 sentence summary", '
    '"metrics": [{\n'
    '  "title": "Metric name",\n'
    '  "value": <raw number>,      # no $, no commas, no formatting\n'
    '  "change": <number>,         # YoY change if stated; otherwise 0\n'
    '  "trend": "up" / "down",\n'
    '  "chartType": "area" / "line" / "bar",\n'
    '  "data": [],  # empty unless multiple time periods found in context\n'
    '  "explain": {"title": "", "value": <number>, "meaning": "", '
    '"formula": "", "benchmark": "", "interpretation": ""}\n'
    "}]}\n\n"
    "RULES:\n"
    "1. ONLY extract metrics whose exact numeric value appears word-for-word in the Context above.\n"
    "2. If the Context does not contain an explicit number for a metric, OMIT it entirely.\n"
    "3. Do NOT calculate, derive, or infer any number — extract only.\n"
    "4. Do NOT use your training data — pretend you have never heard of this company.\n"
    "5. Store 'value' as a raw number: 143800000000 for $143.8B, 34.5 for 34.5%.\n"
    "6. 'data' must be empty unless the Context contains explicit numbers for multiple periods.\n"
    "7. For 'change', extract the stated YoY change; if none is stated, use 0.\n"
    "8. For 'explain', use only the Context text; if the Context doesn't define it, leave fields blank.\n\n"
    "Available metrics (only if present in context): "
    "Revenue, Gross Margin, Operating Margin, Net Income, Free Cash Flow, "
    "Debt-to-Equity, ROE, P/E Ratio, EPS, Operating Income, EBITDA, "
    "Net Profit Margin, Current Ratio, Return on Assets."
)
    name = state.get("company_name") or state.get("company_id", "")
    user = f"Company: {name}\n\n"
    if state["context"]:
        user += f"Context:\n{state['context']}\n\n"
    user += f"IMPORTANT: Do NOT use any knowledge about {name} from your training. Only use numbers that appear in the Context above. Return JSON now."

    result = call_llm(system, user, temperature=0.1, max_tokens=4000)

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
