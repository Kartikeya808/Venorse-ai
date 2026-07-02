const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/auth.middleware");
const { financialAnalysis, financialMetrics, compare, researchMemo, generateMemoSync, chatMessage } = require("../controllers/agent.controller");

router.post("/financial-analysis", authenticate, financialAnalysis);
router.post("/financial-metrics", authenticate, financialMetrics);
router.post("/compare", authenticate, compare);
router.post("/generate-memo", authenticate, researchMemo);
router.post("/sync/generate-memo", authenticate, generateMemoSync);
router.post("/chat", authenticate, chatMessage);

module.exports = router;