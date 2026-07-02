const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/auth.middleware");
const { create, list, getById, update, remove, publish } = require("../controllers/memo.controller");

router.post("/", authenticate, create);
router.get("/", authenticate, list);
router.get("/:id", authenticate, getById);
router.put("/:id", authenticate, update);
router.delete("/:id", authenticate, remove);
router.patch("/:id/publish", authenticate, publish);

module.exports = router;