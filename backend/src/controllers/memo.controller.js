const memoService = require("../services/memo.service");

const create = async (req, res) => {
  try {
    const memo = await memoService.createMemo(req.user.userId, req.body);
    res.status(201).json(memo);
  } catch (err) {
    const status = err.statusCode || 500;
    res.status(status).json({ message: err.message });
  }
};

const list = async (req, res) => {
  try {
    const result = await memoService.listMemos(req.user.userId, req.query);
    res.json(result);
  } catch (err) {
    const status = err.statusCode || 500;
    res.status(status).json({ message: err.message });
  }
};

const getById = async (req, res) => {
  try {
    const memo = await memoService.getMemoById(req.user.userId, req.params.id);
    res.json(memo);
  } catch (err) {
    const status = err.statusCode || 500;
    res.status(status).json({ message: err.message });
  }
};

const update = async (req, res) => {
  try {
    const memo = await memoService.updateMemo(req.user.userId, req.params.id, req.body);
    res.json(memo);
  } catch (err) {
    const status = err.statusCode || 500;
    res.status(status).json({ message: err.message });
  }
};

const remove = async (req, res) => {
  try {
    const result = await memoService.deleteMemo(req.user.userId, req.params.id);
    res.json(result);
  } catch (err) {
    const status = err.statusCode || 500;
    res.status(status).json({ message: err.message });
  }
};

const publish = async (req, res) => {
  try {
    const memo = await memoService.publishMemo(req.user.userId, req.params.id);
    res.json(memo);
  } catch (err) {
    const status = err.statusCode || 500;
    res.status(status).json({ message: err.message });
  }
};

module.exports = { create, list, getById, update, remove, publish };