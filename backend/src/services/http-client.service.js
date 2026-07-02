const path = require("path");
const axios = require("axios");
const config = require("../config");

const agentClient = axios.create({
  baseURL: config.agent.url.trim(),
  timeout: 120000,
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const withRetry = async (fn, retries = 3, delay = 1000) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === retries) throw err;
      console.warn(`[HTTP-CLIENT] Attempt ${attempt} failed, retrying in ${delay}ms...`);
      await sleep(delay);
    }
  }
};

const processDocument = async (documentId, filePath) => {
  const fs = require("fs");
  const absPath = path.resolve(__dirname, "..", "..", filePath);
  const fileBuffer = fs.readFileSync(absPath);
  const { data } = await withRetry(() =>
    agentClient.post("/api/process-document", {
      documentId,
      fileContent: fileBuffer.toString("base64"),
      fileName: path.basename(filePath),
    })
  );
  return data;
};

const processFinancialAnalysis = async (companyId, companyName) => {
  const { data } = await withRetry(() =>
    agentClient.post("/api/financial-analysis", { companyId, companyName })
  );
  return data;
};

const processComparison = async (companyIds) => {
  const { data } = await withRetry(() =>
    agentClient.post("/api/compare", { companyIds })
  );
  return data;
};

const generateResearchMemo = async (companyId, options = {}, companyName) => {
  const { data } = await withRetry(() =>
    agentClient.post("/api/generate-memo", { companyId, companyName, options })
  );
  return data;
};

const processFinancialMetrics = async (companyId) => {
  const { data } = await withRetry(() =>
    agentClient.post("/api/financial-metrics", { companyId })
  );
  return data;
};

const sendChatMessage = async (message, history = [], companyId = "") => {
  const { data } = await withRetry(() =>
    agentClient.post("/api/chat", { message, history, companyId })
  );
  return data;
};

const checkJobStatus = async (jobId) => {
  const { data } = await agentClient.get(`/api/jobs/${jobId}/status`);
  return data;
};

module.exports = {
  processDocument,
  processFinancialAnalysis,
  processFinancialMetrics,
  processComparison,
  generateResearchMemo,
  sendChatMessage,
  checkJobStatus,
};