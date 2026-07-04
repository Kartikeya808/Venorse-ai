const agentService = require("../services/agent.service");
const httpClient = require("../services/http-client.service");

const financialAnalysis = async (req, res) => {
  try {
    const { companyId } = req.body;
    if (!companyId) {
      return res.status(400).json({ message: "companyId is required" });
    }
    const job = await agentService.dispatchFinancialAnalysis(req.user.userId, companyId);
    res.status(201).json(job);
  } catch (err) {
    const status = err.statusCode || 500;
    res.status(status).json({ message: err.message });
  }
};

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

const compare = async (req, res) => {
  try {
    const { companyIds } = req.body;
    const job = await agentService.dispatchComparison(req.user.userId, companyIds);
    res.status(201).json(job);
  } catch (err) {
    const status = err.statusCode || 500;
    res.status(status).json({ message: err.message });
  }
};

const researchMemo = async (req, res) => {
  try {
    const { companyId, options } = req.body;
    if (!companyId) {
      return res.status(400).json({ message: "companyId is required" });
    }
    const job = await agentService.dispatchResearchMemo(req.user.userId, companyId, options);
    res.status(201).json(job);
  } catch (err) {
    const status = err.statusCode || 500;
    res.status(status).json({ message: err.message });
  }
};

const generateMemoSync = async (req, res) => {
  try {
    const { companyId, options } = req.body;
    if (!companyId) {
      return res.status(400).json({ message: "companyId is required" });
    }
    const result = await httpClient.generateResearchMemo(companyId, options);
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const chatMessage = async (req, res) => {
  try {
    const { message, history, companyId } = req.body;
    if (!message) {
      return res.status(400).json({ message: "message is required" });
    }
    const result = await httpClient.sendChatMessage(message, history || [], companyId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { financialAnalysis, financialMetrics, compare, researchMemo, generateMemoSync, chatMessage };