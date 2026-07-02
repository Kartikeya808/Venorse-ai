const researchJobModel = require("../models/ResearchJob");

const listJobs = async (userId, query = {}) => {
  const { status, type, page = 1, limit = 20, sort = "-createdAt" } = query;
  const filter = { userId };
  if (status) filter.status = status;
  if (type) filter.type = type;

  const jobs = await researchJobModel
    .find(filter)
    .sort(sort)
    .skip((page - 1) * limit)
    .limit(Number(limit))
    .populate("documentId", "originalName fileType")
    .populate("companyId", "name ticker");

  const total = await researchJobModel.countDocuments(filter);

  return { jobs, total, page: Number(page), limit: Number(limit) };
};

const getJobById = async (userId, jobId) => {
  const job = await researchJobModel
    .findOne({ _id: jobId, userId })
    .populate("documentId", "originalName fileType")
    .populate("companyId", "name ticker");

  if (!job) {
    const err = new Error("Job not found");
    err.statusCode = 404;
    throw err;
  }
  return job;
};

const getJobStatus = async (userId, jobId) => {
  const job = await researchJobModel
    .findOne({ _id: jobId, userId })
    .select("status progress error type updatedAt");

  if (!job) {
    const err = new Error("Job not found");
    err.statusCode = 404;
    throw err;
  }
  return job;
};

const getJobResult = async (userId, jobId) => {
  const job = await researchJobModel
    .findOne({ _id: jobId, userId })
    .select("status result error");

  if (!job) {
    const err = new Error("Job not found");
    err.statusCode = 404;
    throw err;
  }

  if (job.status !== "completed") {
    const err = new Error("Job is not yet completed");
    err.statusCode = 400;
    throw err;
  }

  return { result: job.result };
};

const retryJob = async (userId, jobId) => {
  const job = await researchJobModel.findOne({ _id: jobId, userId });

  if (!job) {
    const err = new Error("Job not found");
    err.statusCode = 404;
    throw err;
  }

  if (job.status !== "failed") {
    const err = new Error("Only failed jobs can be retried");
    err.statusCode = 400;
    throw err;
  }

  job.status = "pending";
  job.progress = 0;
  job.error = undefined;
  job.result = undefined;
  await job.save();

  return job;
};

module.exports = { listJobs, getJobById, getJobStatus, getJobResult, retryJob };