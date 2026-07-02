const mongoose = require("mongoose");

const ResearchJobSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "Users", required: true },
    documentId: { type: mongoose.Schema.Types.ObjectId, ref: "Documents" },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Companies" },
    type: {
      type: String,
      enum: ["document_summary", "financial_analysis", "comparison", "research_memo"],
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "processing", "completed", "failed"],
      default: "pending",
    },
    progress: { type: Number, default: 0, min: 0, max: 100 },
    result: { type: mongoose.Schema.Types.Mixed },
    error: { type: String },
  },
  { timestamps: true }
);

const researchJobModel = mongoose.model("ResearchJobs", ResearchJobSchema);

module.exports = researchJobModel;
