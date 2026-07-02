const mongoose = require("mongoose");

const CompanySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    ticker: { type: String, required: true, unique: true },
    sector: { type: String },
    industry: { type: String },
    description: { type: String },
    financials: {
      revenue: { type: Number },
      revenueGrowth: { type: Number },
      grossMargin: { type: Number },
      operatingMargin: { type: Number },
      netMargin: { type: Number },
      totalDebt: { type: Number },
      cashAndEquivalents: { type: Number },
      freeCashFlow: { type: Number },
      roe: { type: Number },
      roa: { type: Number },
      marketCap: { type: Number },
      peRatio: { type: Number },
      fiscalYear: { type: String },
    },
  },
  { timestamps: true }
);

const companyModel = mongoose.model("Companies", CompanySchema);

module.exports = companyModel;
