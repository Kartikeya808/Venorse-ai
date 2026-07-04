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
    """Retrieve financial context from vector store."""
    try:
        name = state.get("company_name") or state.get("company_id", "")
        doc_id = state.get("company_id", "")

        logger.info("Retrieving financial data for company=%s doc_id=%s", name, doc_id)

        filters = {"doc_id": doc_id} if doc_id else None

        # Query for each financial statement using the line-item names that
        # actually appear IN the table data (where the numbers live).
        # Section-header-only chunks (e.g. "Condensed Consolidated Statements
        # of Income" on its own line) typically contain zero digits and are
        # filtered out below — we query for the content inside the tables.
        queries = [
            f"{name} Total revenues operating income net income earnings per share income statement",
            f"{name} Total assets current assets long-term debt stockholders equity balance sheet",
            f"{name} Net cash operating activities free cash flow capital expenditures cash flow",
        ]

        seen = set()
        combined = []

        for q in queries:
            logger.debug("Executing retrieval query: %s", q)
            docs = search(q, top_k=8, filters=filters)
            logger.info("Query returned %d documents", len(docs))

            for d in docs:
                sig = (d["content"][:100], d["metadata"].get("chunk"))
                if sig not in seen:
                    seen.add(sig)
                    combined.append(d)

        # Discard chunks with no numerical digits — these are section headers,
        # boilerplate, or narrative text without financial figures.
        combined = [d for d in combined if re.search(r"\d", d["content"])]
        logger.info("After digit-filter: %d chunks", len(combined))

        # Fallback: if targeted queries returned too few digit-bearing chunks,
        # run a broad query to catch anything we missed (e.g. tables whose
        # line-item names differ from the expected keywords).
        if len(combined) < 3:
            logger.warning("Fewer than 3 digit-bearing chunks, running broad fallback query")
            before = len(combined)
            fallback_q = f"{name} financial performance revenue income balance cash"
            fb_docs = search(fallback_q, top_k=10, filters=filters)
            for d in fb_docs:
                sig = (d["content"][:100], d["metadata"].get("chunk"))
                if sig not in seen and re.search(r"\d", d["content"]):
                    seen.add(sig)
                    combined.append(d)
            logger.info("Fallback added %d chunks (total=%d)", len(combined) - before, len(combined))

        # Sort by document position so canonical statements appear in order
        # (income statement body before balance sheet body before segment detail).
        combined.sort(key=lambda d: d["metadata"].get("chunk", 0))

        context = format_context(combined, max_chars=8000)
        total_chars = len(context)

        logger.info(
            "Retrieval complete: %d unique chunks, %d chars context, filter=%s",
            len(combined), total_chars, bool(filters)
        )

        if total_chars < 100:
            logger.warning("Context too small (%d chars), might result in poor analysis", total_chars)

        return {"context": context, "error": ""}
    except Exception as e:
        logger.error("Retrieval failed: %s", e, exc_info=True)
        return {"context": "", "error": str(e)}


def analyze_node(state: FinancialMetricsState) -> dict:
    """Analyze financial metrics from context."""
    name = state.get("company_name") or state.get("company_id", "")
    ctx = state.get("context", "")

    logger.info("Analyzing metrics for %s (context_len=%d)", name, len(ctx))

    # Early exit if no context
    if not ctx.strip():
        logger.warning("No financial data found for %s", name)
        return {
            "metrics": [],
            "analysis_text": "No financial data found for this document. Ensure the document contains structured financial statements (income statement, balance sheet, or cash flow).",
            "error": ""
        }

    # Build prompts
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
        "PREFERENCE RULES:\n"
        "- For Revenue, prefer the 'Total revenues' line from the Consolidated Income Statement over segment-level revenue.\n"
        "- For Operating Income, prefer the consolidated total from the Income Statement, not segment operating income.\n"
        "- For Net Income, use the bottom-line Net Income (or Net Income Attributable to parent) from the Income Statement.\n"
        "- For Cash & Equivalents, prefer the Balance Sheet figure.\n"
        "- For Debt, prefer the total long-term debt from the Balance Sheet.\n"
        "- For Operating Cash Flow, use the total from the Cash Flow Statement.\n"
        "- Prefer consolidated/canonical financial statement figures over segment or narrative detail.\n"
        "Metrics: Revenue, Gross Margin, Operating Margin, Net Income, Free Cash Flow, "
        "Debt-to-Equity, ROE, P/E Ratio, EPS, Operating Income, EBITDA, Net Profit Margin, "
        "Current Ratio, Return on Assets.\n"
        "Schema: {\"analysis_text\":\"summary\",\"metrics\":["
        "{\"title\":\"\",\"value\":0,\"change\":0,\"trend\":\"up\",\"chartType\":\"area\",\"data\":[{\"value\":0}],"
        "\"explain\":{\"meaning\":\"\",\"formula\":\"\",\"benchmark\":\"\",\"interpretation\":\"\"}}]}"
    )

    user = f"Company: {name}\n\nContext:\n{ctx}\n\n"
    user += f"Return JSON for {name} using ONLY numbers from Context above. If no numbers match any metric, return {{\"analysis_text\":\"No metrics found\",\"metrics\":[]}}."

    # Call LLM with retries
    logger.info("Calling LLM for metric extraction")
    result = call_llm(system, user, temperature=0.1, max_tokens=6000)

    # Handle API errors
    if result.startswith("[OpenRouter API error:"):
        logger.error("OpenRouter API error: %s", result)
        return {
            "metrics": [],
            "analysis_text": "Financial metrics are temporarily unavailable due to an API error. Please try again later.",
            "error": result,
        }

    # Parse JSON
    parsed = _parse_llm_json(result)
    if parsed is None:
        logger.error("LLM returned unparseable JSON: %s", result[:200])
        return {
            "metrics": [],
            "analysis_text": "Unable to parse financial metrics. The response was invalid JSON.",
            "error": "Invalid JSON from LLM",
        }

    metrics = parsed.get("metrics", [])
    analysis_text = parsed.get("analysis_text", result)

    logger.info("Parsed %d metrics from LLM", len(metrics))

    # Validate and format metrics
    validated = []
    for m in metrics:
        required_fields = ("title", "value", "change", "trend", "chartType", "data", "explain")
        missing = [f for f in required_fields if f not in m]

        if missing:
            logger.warning("Skipping metric %s: missing fields %s", m.get("title", "unknown"), missing)
            continue

        try:
            m["value"] = _fmt_val(m["value"], m["title"])
            m["change"] = _fmt_chg(m["change"], m["title"])

            if "explain" in m:
                for ek in ("meaning", "formula", "benchmark", "interpretation"):
                    if ek in m["explain"]:
                        m["explain"][ek] = str(m["explain"][ek])
                if "value" in m["explain"]:
                    m["explain"]["value"] = _fmt_val(m["explain"]["value"], m["title"])

            validated.append(m)
        except Exception as e:
            logger.warning("Error formatting metric %s: %s", m.get("title"), e)
            continue

    if not validated:
        logger.error("No valid metrics extracted from LLM response")
        return {
            "metrics": [],
            "analysis_text": "No structured financial metrics could be extracted from the documents.",
            "error": "No valid metrics",
        }

    logger.info("Successfully validated %d metrics", len(validated))
    return {"metrics": validated, "analysis_text": analysis_text, "error": ""}


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
