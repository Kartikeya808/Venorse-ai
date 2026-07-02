const express = require("express");
const router = express.Router();
const agentService = require("../services/agent.service");

router.post("/agent/job-complete", async (req, res) => {
  try {
    agentService.verifyWebhook(req);
    const job = await agentService.processWebhookUpdate(req.body);
    res.json(job);
  } catch (err) {
    const status = err.statusCode || 500;
    res.status(status).json({ message: err.message });
  }
});

module.exports = router;