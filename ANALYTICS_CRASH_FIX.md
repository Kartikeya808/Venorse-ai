# Analytics Feature Crash - Root Cause Analysis & Fix

## Problem Statement
Your analytics feature is still crashing even after switching to a better LLM model. The issue is **not** the model itself, but rather a cascade of failures in data retrieval, validation, and error handling.

---

## Root Causes Identified

### 🔴 Issue 1: Vector Store Query Returns Empty Context
**File:** `langgraph/app/rag/vector_store.py` (Line 103-119)

```python
def search(query: str, top_k: int = 5, filters: Optional[dict] = None) -> list[dict]:
    collection = get_or_create_collection()
    where = filters or {}
    results = collection.query(
        query_texts=[query],
        n_results=top_k,
        where=where or None,  # ❌ PROBLEM: filters might be empty
    )
```

**Problem:**
- When `filters={"doc_id": selectedDocId}` is passed, ChromaDB performs a **strict metadata filter**
- If the metadata field `doc_id` doesn't match exactly, **zero results** are returned
- LLM then receives empty context and crashes trying to extract metrics from nothing

**Why this happens:**
- Document chunks are stored with metadata: `{"doc_id": document._id, "chunk": 0, "page": "1"}`
- But when searching, the filter is exact-match: `where={"doc_id": doc_id}`
- If `doc_id` in search != `doc_id` in metadata, zero results

**Test this:**
```python
# Frontend sends selectedDocId (which might be formatted differently)
# Backend receives it and passes to search()
# ChromaDB does: collection.query(..., where={"doc_id": selectedDocId})
# If the stored doc_id doesn't match exactly → NO RESULTS
```

---

### 🔴 Issue 2: LLM Receives Empty Context But No Graceful Fallback
**File:** `langgraph/app/agents/financial_metrics_agent.py` (Line 118-119)

```python
if not ctx.strip():
    return {"metrics": [], "analysis_text": "No financial data found for this document."}
```

**Problem:**
- This fallback is **good** but it's triggered silently
- Frontend shows "No analytics data available" instead of "Please upload documents first"
- Users don't know if it's their document or a real error

---

### 🔴 Issue 3: JSON Parsing Crashes on LLM Malformed Output
**File:** `langgraph/app/agents/financial_metrics_agent.py` (Line 123)

```python
result = call_llm(system, user, temperature=0.1, max_tokens=4000)

if result.startswith("[OpenRouter API error:"):
    # Handles API errors
    ...

parsed = _parse_llm_json(result)  # ❌ Can return None
if parsed is None:
    # Tries to handle but logs incomplete metric validation
    ...
```

**Problem:**
- LLM might return valid JSON but with **missing required fields** (title, value, change, etc.)
- Validation on line 146 checks for all fields, but doesn't provide clear error
- If any metric lacks `explain` object, entire response is marked invalid

---

### 🔴 Issue 4: Mismatch Between Expected & Actual Data Structure
**File:** `langgraph/app/routers/financial_metrics_router.py` (Line 13-19)

```python
result = await run_financial_metrics_agent(req.companyId, req.companyName)
return {
    "company_id": req.companyId,
    "metrics": result.get("metrics", []),
    "analysis_text": result.get("analysis_text", ""),
    "error": result.get("error", ""),  # ❌ Might not exist
}
```

**Problem:**
- If agent returns `error=""` (empty string), frontend checks `if (apiError)` which is falsy
- But error could exist with value - then frontend crashes trying to parse metrics
- **Data shape mismatch** between frontend expectations and actual response

---

### 🔴 Issue 5: No Validation of Selected Document
**File:** `frontend/src/app/dashboard/page.tsx` (Line 85)

```typescript
const res = await api.post('/agent/financial-metrics', { 
  companyId: selectedDocId,  // ❌ Might not be valid
  companyName: selectedDoc?.companyName || '' 
});
```

**Problem:**
- `selectedDocId` is just the document ID, **NOT** a company ID
- RAG retriever uses `doc_id` filter, not `companyId` filter
- Metadata stores documents by document ID, but agent searches by company ID - **MISMATCH**

**Backend flow:**
```
Frontend: POST /agent/financial-metrics { companyId: "doc_507f3..." }
         ↓
Backend: passes companyId to financial_metrics_agent
         ↓
Agent: search(query, filters={"doc_id": "doc_507f3..."})
         ↓
ChromaDB: WHERE doc_id = "doc_507f3..." → checks metadata
         ↓
Result: EMPTY (metadata has different structure)
```

---

## Fix Plan

### Fix 1: Normalize Document ID Handling in RAG
**File:** `langgraph/app/rag/vector_store.py` (UPDATE)

```python
def search(query: str, top_k: int = 5, filters: Optional[dict] = None) -> list[dict]:
    """Search vector store with optional metadata filters.
    
    Args:
        query: Search query text
        top_k: Number of results to return
        filters: ChromaDB where clause, e.g., {"doc_id": "123"}
        
    Returns:
        List of documents with content, metadata, and similarity score
    """
    collection = get_or_create_collection()
    
    # Ensure filters is dict (ChromaDB requires dict or None, not empty {})
    where = filters if filters else None
    
    try:
        results = collection.query(
            query_texts=[query],
            n_results=top_k,
            where=where,
        )
    except Exception as e:
        logger.error("ChromaDB query failed: %s", e)
        return []
    
    documents = []
    if results["documents"] and results["documents"][0]:
        for i, doc in enumerate(results["documents"][0]):
            documents.append({
                "content": doc,
                "metadata": results["metadatas"][0][i] if results["metadatas"] else {},
                "score": results["distances"][0][i] if results["distances"] else 0,
            })
    
    logger.info("Search returned %d results for query (filtered=%s)", len(documents), bool(where))
    return documents
```

**Why:** Explicit `where=None` instead of `where={}` ensures ChromaDB doesn't do strict filtering when not needed.

---

### Fix 2: Enhanced Logging in Financial Metrics Agent
**File:** `langgraph/app/agents/financial_metrics_agent.py` (UPDATE)

```python
def retrieve_node(state: FinancialMetricsState) -> dict:
    """Retrieve financial context from vector store."""
    try:
        name = state.get("company_name") or state.get("company_id", "")
        doc_id = state.get("company_id", "")
        
        logger.info("Retrieving financial data for company=%s doc_id=%s", name, doc_id)
        
        filters = {"doc_id": doc_id} if doc_id else None
        
        queries = [
            f"{name} revenue net income gross margin operating income",
            f"{name} balance sheet assets debt equity cash",
            f"{name} cash flow operating free cash flow",
        ]
        
        seen = set()
        combined = []
        
        for q in queries:
            logger.debug("Executing retrieval query: %s", q)
            docs = search(q, top_k=3, filters=filters)
            logger.info("Query returned %d documents", len(docs))
            
            for d in docs:
                sig = (d["content"][:100], d["metadata"].get("chunk"))
                if sig not in seen:
                    seen.add(sig)
                    combined.append(d)
        
        context = format_context(combined, max_chars=4000)
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
    result = call_llm(system, user, temperature=0.1, max_tokens=4000)
    
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
```

---

### Fix 3: Improve Frontend Error Handling
**File:** `frontend/src/app/dashboard/page.tsx` (UPDATE fetchMetrics)

```typescript
const fetchMetrics = async () => {
  setMetricsLoading(true);
  setMetricsError(null);
  
  // Validate prerequisites
  if (!selectedDocId) {
    setMetricsError("No document selected");
    setMetrics([]);
    setMetricsLoading(false);
    return;
  }
  
  if (!selectedDoc) {
    setMetricsError("Selected document not found");
    setMetrics([]);
    setMetricsLoading(false);
    return;
  }
  
  try {
    const res = await api.post('/agent/financial-metrics', { 
      companyId: selectedDocId,  // Document ID
      companyName: selectedDoc.companyName || '' 
    });
    
    // Check for API-level errors
    if (!res.data) {
      setMetricsError('Empty response from server');
      setMetrics([]);
      return;
    }
    
    // Check for agent-level errors
    const { error, metrics, analysis_text } = res.data;
    
    if (error && error.trim()) {
      // Real error occurred
      const errorMsg = error.startsWith('[OpenRouter API error:') 
        ? 'LLM API is temporarily unavailable. Please try again later.'
        : error;
      setMetricsError(errorMsg);
      setMetrics([]);
      return;
    }
    
    // Check if metrics array is valid
    if (!Array.isArray(metrics)) {
      setMetricsError('Invalid metrics format from server');
      setMetrics([]);
      return;
    }
    
    // Map metrics with validation
    const mapped = metrics.map((m: any) => {
      // Validate required fields
      const required = ['title', 'value', 'change', 'trend', 'chartType', 'data', 'explain'];
      const hasAllFields = required.every(field => field in m);
      
      if (!hasAllFields) {
        console.warn('Metric missing fields:', m);
        return null;
      }
      
      return {
        title: m.title,
        value: m.value,
        change: m.change,
        trend: m.trend as 'up' | 'down',
        chartType: m.chartType as 'area' | 'line' | 'bar',
        data: m.data || [],
        explain: m.explain as MetricExplainData,
      };
    }).filter((m: any) => m !== null);
    
    if (mapped.length === 0) {
      setMetricsError(analysis_text || 'No metrics could be extracted from the document. Ensure it contains financial statements.');
      setMetrics([]);
      return;
    }
    
    // Cache and set
    if (selectedDocId) {
      metricsCacheRef.current[selectedDocId] = mapped;
    }
    setMetrics(mapped);
  } catch (err: any) {
    console.error('Metrics fetch error:', err);
    const msg = err?.response?.data?.message 
      || err?.response?.data?.error
      || err?.message 
      || 'Failed to fetch metrics';
    setMetricsError(msg);
    setMetrics([]);
  } finally {
    setMetricsLoading(false);
  }
};
```

---

### Fix 4: Add Debug Route for Testing
**File:** `langgraph/app/routers/debug_router.py` (NEW)

```python
import logging
from fastapi import APIRouter
from app.rag.vector_store import search, get_or_create_collection
from app.config import settings

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/debug/collections")
async def debug_collections():
    """Check ChromaDB collections and their contents."""
    try:
        client = get_or_create_collection()
        # Note: ChromaDB doesn't expose list_collections on collection object
        # This is a debug endpoint to check if vector store is working
        collection = get_or_create_collection()
        count = collection.count()
        return {
            "status": "ok",
            "collection_name": settings.chroma_collection,
            "document_count": count,
            "embedding_model": "jina-embeddings-v3",
        }
    except Exception as e:
        logger.error("Debug collections failed: %s", e)
        return {"error": str(e), "status": "failed"}


@router.post("/debug/search-test")
async def debug_search(query: str, doc_id: str = None, top_k: int = 3):
    """Test vector store search with optional document filter."""
    try:
        filters = {"doc_id": doc_id} if doc_id else None
        results = search(query, top_k=top_k, filters=filters)
        
        return {
            "query": query,
            "filters": filters,
            "results_count": len(results),
            "results": [
                {
                    "content": r["content"][:200],  # First 200 chars
                    "metadata": r["metadata"],
                    "score": r["score"],
                }
                for r in results
            ]
        }
    except Exception as e:
        logger.error("Debug search failed: %s", e)
        return {"error": str(e), "status": "failed"}
```

Add to `langgraph/app/main.py`:
```python
from app.routers.debug_router import router as debug_router

# Add after other routers
app.include_router(debug_router, prefix="/api/debug", tags=["debug"])
```

---

### Fix 5: Backend Validation of Company ID
**File:** `backend/src/controllers/agent.controller.js` (UPDATE)

```javascript
const financialMetrics = async (req, res) => {
  try {
    const { companyId, companyName } = req.body;
    
    // Validate input
    if (!companyId || typeof companyId !== 'string') {
      return res.status(400).json({ 
        error: 'INVALID_REQUEST',
        message: 'companyId is required and must be a string' 
      });
    }
    
    // Log the request
    console.log(`[METRICS] Processing metrics request: companyId=${companyId}, companyName=${companyName}`);
    
    try {
      const result = await httpClient.processFinancialMetrics(companyId, companyName || "");
      
      // Ensure result has expected structure
      const response = {
        company_id: companyId,
        metrics: result.metrics || [],
        analysis_text: result.analysis_text || '',
        error: result.error || '',
      };
      
      console.log(`[METRICS] Response: ${response.metrics.length} metrics, error="${response.error}"`);
      res.json(response);
    } catch (serviceErr) {
      console.error(`[METRICS] Service error for companyId=${companyId}:`, serviceErr.message);
      res.status(500).json({
        error: 'METRICS_SERVICE_ERROR',
        message: serviceErr.message,
      });
    }
  } catch (err) {
    console.error('[METRICS] Controller error:', err);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: err.message,
    });
  }
};

module.exports = { upload, list, getById, update, remove, financialMetrics };
```

---

## Testing Checklist

- [ ] **Test 1: Vector store retrieval**
  ```bash
  curl -X POST http://localhost:8000/api/debug/search-test \
    -H "Content-Type: application/json" \
    -d '{"query":"revenue", "doc_id":"507f3...", "top_k": 5}'
  ```
  Expected: Returns documents with metadata matching doc_id

- [ ] **Test 2: Empty document**
  - Upload a document
  - Try to fetch metrics immediately (before processing completes)
  - Expected: "No financial data found" error message

- [ ] **Test 3: Valid financial document**
  - Upload a PDF with financial statements
  - Wait for processing to complete
  - Fetch metrics
  - Expected: 3-5 valid metrics with explain data

- [ ] **Test 4: Invalid JSON from LLM**
  - Add test case in `call_llm()` to return malformed JSON
  - Expected: Graceful error "Unable to parse financial metrics"

- [ ] **Test 5: Network timeout**
  - Kill OpenRouter API temporarily
  - Try to fetch metrics
  - Expected: "API error" message after 3 retries

---

## Summary

The analytics crashes aren't due to the model, but:

1. **Empty context retrieval** - Document ID mismatch in vector store filters
2. **No logging** - Can't debug what's happening in the agent
3. **Frontend validation missing** - Doesn't validate metric structure before rendering
4. **LLM JSON parsing** - Incomplete error handling
5. **ID mismatch** - Using document ID as company ID

This fix ensures **every step logs thoroughly** and **gracefully handles failures** at each layer.

