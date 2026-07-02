const mongoose = require("mongoose");

const DocumentSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "Users", required: true },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Companies" },
    originalName: { type: String, required: true },
    storedPath: { type: String, required: true },
    fileType: { type: String, required: true },
    fileSize: { type: Number, required: true },
    status: {
      type: String,
      enum: ["uploaded", "processing", "completed", "failed"],
      default: "uploaded",
    },
    aiSummary: {
      revenue: { type: String },
      risks: { type: String },
      growthDrivers: { type: String },
      outlook: { type: String },
      fullSummary: { type: String },
    },
  },
  { timestamps: true }
);

const documentModel = mongoose.model("Documents", DocumentSchema);

module.exports = documentModel;
