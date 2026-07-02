const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/auth.middleware");
const { create, list, getById, getByTicker, update, remove, search } = require("../controllers/company.controller");

router.post("/", authenticate, create);
router.get("/", authenticate, list);
router.get("/search", authenticate, search);
router.get("/ticker/:ticker", authenticate, getByTicker);
router.get("/:id", authenticate, getById);
router.put("/:id", authenticate, update);
router.delete("/:id", authenticate, remove);

module.exports = router;