const companyService = require("../services/company.service");

const create = async (req, res) => {
  try {
    const company = await companyService.createCompany(req.body);
    res.status(201).json(company);
  } catch (err) {
    const status = err.statusCode || 500;
    res.status(status).json({ message: err.message });
  }
};

const list = async (req, res) => {
  try {
    const result = await companyService.listCompanies(req.query);
    res.json(result);
  } catch (err) {
    const status = err.statusCode || 500;
    res.status(status).json({ message: err.message });
  }
};

const getById = async (req, res) => {
  try {
    const company = await companyService.getCompanyById(req.params.id);
    res.json(company);
  } catch (err) {
    const status = err.statusCode || 500;
    res.status(status).json({ message: err.message });
  }
};

const getByTicker = async (req, res) => {
  try {
    const company = await companyService.getCompanyByTicker(req.params.ticker);
    res.json(company);
  } catch (err) {
    const status = err.statusCode || 500;
    res.status(status).json({ message: err.message });
  }
};

const update = async (req, res) => {
  try {
    const company = await companyService.updateCompany(req.params.id, req.body);
    res.json(company);
  } catch (err) {
    const status = err.statusCode || 500;
    res.status(status).json({ message: err.message });
  }
};

const remove = async (req, res) => {
  try {
    const result = await companyService.deleteCompany(req.params.id);
    res.json(result);
  } catch (err) {
    const status = err.statusCode || 500;
    res.status(status).json({ message: err.message });
  }
};

const search = async (req, res) => {
  try {
    const companies = await companyService.searchCompanies(req.query.q);
    res.json(companies);
  } catch (err) {
    const status = err.statusCode || 500;
    res.status(status).json({ message: err.message });
  }
};

module.exports = { create, list, getById, getByTicker, update, remove, search };