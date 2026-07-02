const jobService = require("../services/job.service");

const list = async (req, res) => {
  try {
    const result = await jobService.listJobs(req.user.userId, req.query);
    res.json(result);
  } catch (err) {
    const status = err.statusCode || 500;
    res.status(status).json({ message: err.message });
  }
};

const getById = async (req, res) => {
  try {
    const job = await jobService.getJobById(req.user.userId, req.params.id);
    res.json(job);
  } catch (err) {
    const status = err.statusCode || 500;
    res.status(status).json({ message: err.message });
  }
};

const getStatus = async (req, res) => {
  try {
    const status = await jobService.getJobStatus(req.user.userId, req.params.id);
    res.json(status);
  } catch (err) {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({ message: err.message });
  }
};

const getResult = async (req, res) => {
  try {
    const result = await jobService.getJobResult(req.user.userId, req.params.id);
    res.json(result);
  } catch (err) {
    const status = err.statusCode || 500;
    res.status(status).json({ message: err.message });
  }
};

const retry = async (req, res) => {
  try {
    const job = await jobService.retryJob(req.user.userId, req.params.id);
    res.json(job);
  } catch (err) {
    const status = err.statusCode || 500;
    res.status(status).json({ message: err.message });
  }
};

module.exports = { list, getById, getStatus, getResult, retry };