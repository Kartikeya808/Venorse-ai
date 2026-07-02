const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/auth.middleware");
const { get, update } = require("../controllers/settings.controller");

router.get("/", authenticate, get);
router.put("/", authenticate, update);

module.exports = router;