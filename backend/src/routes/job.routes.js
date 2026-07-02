const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/auth.middleware");
const { list, getById, getStatus, getResult, retry } = require("../controllers/job.controller");

router.get("/", authenticate, list);
router.get("/:id", authenticate, getById);
router.get("/:id/status", authenticate, getStatus);
router.get("/:id/result", authenticate, getResult);
router.post("/:id/retry", authenticate, retry);

module.exports = router;