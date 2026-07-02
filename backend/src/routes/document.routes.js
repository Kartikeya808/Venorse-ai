const express = require("express");
const router = express.Router();
const multer = require("multer");
const { authenticate } = require("../middleware/auth.middleware");
const { upload, list, getById, update, remove } = require("../controllers/document.controller");

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, "src/uploads/"),
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + "-" + file.originalname);
  },
});

const uploadMiddleware = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });

router.get("/", authenticate, list);
router.get("/:id", authenticate, getById);
router.put("/:id", authenticate, update);
router.delete("/:id", authenticate, remove);
router.post("/upload", authenticate, uploadMiddleware.single("file"), upload);

module.exports = router;
