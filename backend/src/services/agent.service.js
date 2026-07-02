const researchJobModel = require("../models/ResearchJob");
const documentModel = require("../models/Document");
const companyModel = require("../models/Company");
const httpClient = require("./http-client.service");

const AGENT_WEBHOOK_SECRET = process.env.AGENT_WEBHOOK_SECRET || "venorse-webhook-secret";

const verifyWebhook = (req) => {
  const secret = req.headers["x-webhook-secret"];
  if (secret !== AGENT_WEBHOOK_SECRET) {
    const err = new Error("Invalid webhook secret");
    err.statusCode = 401;
    throw err;
  }
};

const dispatchJob = async (userId, type, agentFn, ...agentArgs) => {
  const job = await researchJobModel.create({
    userId,
    type,
    status: "pending",
    progress: 0,
  });

  _fireAgent(job._id, agentFn, agentArgs);

  return job;
};

const _fireAgent = async (jobId, agentFn, agentArgs) => {
  try {
    const result = await agentFn(...agentArgs);
    await researchJobModel.findByIdAndUpdate(jobId, {
      status: "completed",
      progress: 100,
      result,
    });
    const job = await researchJobModel.findById(jobId);
    if (job) {
      await handleJobCompletion(jobId, job.type, result);
    }
  } catch (err) {
    console.error(`[AGENT] Job ${jobId} failed:`, err.message, err.stack?.split("\n").slice(0, 3).join(" "));
    await researchJobModel.findByIdAndUpdate(jobId, {
      status: "failed",
      error: err.message,
    });
  }
};

const handleJobCompletion = async (jobId, type, result) => {
  const job = await researchJobModel.findById(jobId);

  if (type === "document_summary" && job.documentId) {
    const summary = result.summary || result.aiSummary || result;
    const update = { status: "completed" };
    if (typeof summary === "string") {
      update.aiSummary = { fullSummary: summary };
    } else {
      update.aiSummary = {
        revenue: summary.revenue || "",
        risks: summary.risks || "",
        growthDrivers: summary.growthDrivers || "",
        outlook: summary.outlook || "",
        fullSummary: summary.fullSummary || JSON.stringify(summary),
      };
    }
    await documentModel.findByIdAndUpdate(job.documentId, { $set: update });
  }
};

const processWebhookUpdate = async (body) => {
  const { jobId, status, result, error, progress } = body;

  const update = {};
  if (status) update.status = status;
  if (result !== undefined) update.result = result;
  if (error) update.error = error;
  if (progress !== undefined) update.progress = progress;

  const job = await researchJobModel.findByIdAndUpdate(jobId, { $set: update }, { new: true });
  if (!job) {
    const err = new Error("Job not found");
    err.statusCode = 404;
    throw err;
  }

  if (status === "completed") {
    await handleJobCompletion(jobId, job.type, result || job.result);
  }

  return job;
};

const dispatchFinancialAnalysis = async (userId, companyId) => {
  const company = await companyModel.findById(companyId);
  if (!company) {
    const err = new Error("Company not found");
    err.statusCode = 404;
    throw err;
  }

  return dispatchJob(
    userId,
    "financial_analysis",
    httpClient.processFinancialAnalysis,
    companyId
  );
};

const dispatchComparison = async (userId, companyIds) => {
  if (!Array.isArray(companyIds) || companyIds.length < 2) {
    const err = new Error("At least two company IDs are required");
    err.statusCode = 400;
    throw err;
  }

  const companies = await companyModel.find({ _id: { $in: companyIds } });
  if (companies.length !== companyIds.length) {
    const err = new Error("One or more companies not found");
    err.statusCode = 404;
    throw err;
  }

  return dispatchJob(
    userId,
    "comparison",
    httpClient.processComparison,
    companyIds
  );
};

const dispatchResearchMemo = async (userId, companyId, options = {}) => {
  const company = await companyModel.findById(companyId);
  if (!company) {
    const err = new Error("Company not found");
    err.statusCode = 404;
    throw err;
  }

  const job = await dispatchJob(
    userId,
    "research_memo",
    httpClient.generateResearchMemo,
    companyId,
    options
  );

  await researchJobModel.findByIdAndUpdate(job._id, {
    $set: { companyId },
  });

  return researchJobModel.findById(job._id);
};

const attachAgentToJob = (jobId, agentFn, ...agentArgs) => {
  _fireAgent(jobId, agentFn, agentArgs);
};

module.exports = {
  dispatchFinancialAnalysis,
  dispatchComparison,
  dispatchResearchMemo,
  dispatchJob,
  attachAgentToJob,
  processWebhookUpdate,
  verifyWebhook,
};