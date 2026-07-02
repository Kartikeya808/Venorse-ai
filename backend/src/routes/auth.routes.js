const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/auth.middleware");
const { signup, signin, me, updateMe, updateMyPassword, deleteMe } = require("../controllers/auth.controller");

router.post("/signup", signup);
router.post("/signin", signin);
router.get("/me", authenticate, me);
router.put("/me", authenticate, updateMe);
router.put("/me/password", authenticate, updateMyPassword);
router.delete("/me", authenticate, deleteMe);

module.exports = router;
