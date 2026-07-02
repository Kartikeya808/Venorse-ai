const companyModel = require("../models/Company");

const createCompany = async (data) => {
  const existing = await companyModel.findOne({ ticker: data.ticker });
  if (existing) {
    const err = new Error("Company with this ticker already exists");
    err.statusCode = 409;
    throw err;
  }
  return companyModel.create(data);
};

const listCompanies = async (query = {}) => {
  const { sector, industry, page = 1, limit = 20, sort = "name" } = query;
  const filter = {};
  if (sector) filter.sector = sector;
  if (industry) filter.industry = industry;

  const companies = await companyModel
    .find(filter)
    .sort(sort)
    .skip((page - 1) * limit)
    .limit(Number(limit));

  const total = await companyModel.countDocuments(filter);

  return { companies, total, page: Number(page), limit: Number(limit) };
};

const getCompanyById = async (id) => {
  const company = await companyModel.findById(id);
  if (!company) {
    const err = new Error("Company not found");
    err.statusCode = 404;
    throw err;
  }
  return company;
};

const getCompanyByTicker = async (ticker) => {
  const company = await companyModel.findOne({ ticker: ticker.toUpperCase() });
  if (!company) {
    const err = new Error("Company not found");
    err.statusCode = 404;
    throw err;
  }
  return company;
};

const updateCompany = async (id, updates) => {
  if (updates.ticker) {
    const existing = await companyModel.findOne({
      ticker: updates.ticker,
      _id: { $ne: id },
    });
    if (existing) {
      const err = new Error("Ticker already in use");
      err.statusCode = 409;
      throw err;
    }
  }

  const company = await companyModel
    .findByIdAndUpdate(id, { $set: updates }, { new: true, runValidators: true });

  if (!company) {
    const err = new Error("Company not found");
    err.statusCode = 404;
    throw err;
  }
  return company;
};

const deleteCompany = async (id) => {
  const company = await companyModel.findByIdAndDelete(id);
  if (!company) {
    const err = new Error("Company not found");
    err.statusCode = 404;
    throw err;
  }
  return { message: "Company deleted successfully" };
};

const searchCompanies = async (q) => {
  if (!q) {
    const err = new Error("Search query is required");
    err.statusCode = 400;
    throw err;
  }
  const regex = new RegExp(q, "i");
  return companyModel
    .find({
      $or: [{ name: regex }, { ticker: regex }],
    })
    .limit(20)
    .sort("name");
};

module.exports = {
  createCompany,
  listCompanies,
  getCompanyById,
  getCompanyByTicker,
  updateCompany,
  deleteCompany,
  searchCompanies,
};