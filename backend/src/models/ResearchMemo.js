const mongoose = require("mongoose");

const ResearchMemoSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "Users", required: true },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Companies", required: true },
    title: { type: String, required: true },
    sections: {
      executiveSummary: { type: String },
      financialHealth: { type: String },
      growthDrivers: { type: String },
      riskFactors: { type: String },
      valuation: { type: String },
      sources: [{ type: String }],
    },
    status: {
      type: String,
      enum: ["draft", "completed"],
      default: "draft",
    },
  },
  { timestamps: true }
);

const researchMemoModel = mongoose.model("ResearchMemos", ResearchMemoSchema);

module.exports = researchMemoModel;
