from pydantic import BaseModel


class ProcessDocumentRequest(BaseModel):
    documentId: str
    filePath: str


class ProcessDocumentResponse(BaseModel):
    document_id: str
    summary: str
    chunks: list[str]


class FinancialAnalysisRequest(BaseModel):
    companyId: str


class FinancialAnalysisResponse(BaseModel):
    company_id: str
    analysis_result: str


class ComparisonRequest(BaseModel):
    companyIds: list[str]


class ComparisonResponse(BaseModel):
    comparison_result: str


class GenerateMemoRequest(BaseModel):
    companyId: str
    options: dict = {}


class GenerateMemoResponse(BaseModel):
    memo_result: str


class FinancialMetricsRequest(BaseModel):
    companyId: str


class MetricExplain(BaseModel):
    title: str
    value: str
    meaning: str
    formula: str
    benchmark: str
    interpretation: str


class MetricData(BaseModel):
    value: float


class MetricEntry(BaseModel):
    title: str
    value: str
    change: str
    trend: str
    chartType: str
    data: list[MetricData]
    explain: MetricExplain


class FinancialMetricsResponse(BaseModel):
    company_id: str
    metrics: list[MetricEntry]
    analysis_text: str


class ChatRequest(BaseModel):
    message: str
    history: list[dict] = []
    companyId: str = ""


class ChatResponse(BaseModel):
    response: str
