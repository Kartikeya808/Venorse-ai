const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/auth.middleware");
const { add, list, remove, check } = require("../controllers/watchlist.controller");

router.post("/", authenticate, add);
router.get("/", authenticate, list);
router.delete("/:id", authenticate, remove);
router.get("/check/:companyId", authenticate, check);

module.exports = router;