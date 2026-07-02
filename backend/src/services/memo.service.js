const researchMemoModel = require("../models/ResearchMemo");
const companyModel = require("../models/Company");

const createMemo = async (userId, data) => {
  const { companyId, title, sections } = data;

  const company = await companyModel.findById(companyId);
  if (!company) {
    const err = new Error("Company not found");
    err.statusCode = 404;
    throw err;
  }

  return researchMemoModel.create({ userId, companyId, title, sections });
};

const listMemos = async (userId, query = {}) => {
  const { status, page = 1, limit = 20, sort = "-createdAt" } = query;
  const filter = { userId };
  if (status) filter.status = status;

  const memos = await researchMemoModel
    .find(filter)
    .sort(sort)
    .skip((page - 1) * limit)
    .limit(Number(limit))
    .populate("companyId", "name ticker");

  const total = await researchMemoModel.countDocuments(filter);

  return { memos, total, page: Number(page), limit: Number(limit) };
};

const getMemoById = async (userId, memoId) => {
  const memo = await researchMemoModel
    .findOne({ _id: memoId, userId })
    .populate("companyId", "name ticker sector industry");

  if (!memo) {
    const err = new Error("Memo not found");
    err.statusCode = 404;
    throw err;
  }
  return memo;
};

const updateMemo = async (userId, memoId, updates) => {
  const allowed = ["title", "sections"];
  const filtered = {};
  for (const key of allowed) {
    if (updates[key] !== undefined) filtered[key] = updates[key];
  }

  const memo = await researchMemoModel
    .findOneAndUpdate({ _id: memoId, userId }, { $set: filtered }, { new: true, runValidators: true })
    .populate("companyId", "name ticker");

  if (!memo) {
    const err = new Error("Memo not found");
    err.statusCode = 404;
    throw err;
  }
  return memo;
};

const deleteMemo = async (userId, memoId) => {
  const memo = await researchMemoModel.findOneAndDelete({ _id: memoId, userId });
  if (!memo) {
    const err = new Error("Memo not found");
    err.statusCode = 404;
    throw err;
  }
  return { message: "Memo deleted successfully" };
};

const publishMemo = async (userId, memoId) => {
  const memo = await researchMemoModel
    .findOneAndUpdate(
      { _id: memoId, userId },
      { $set: { status: "completed" } },
      { new: true }
    )
    .populate("companyId", "name ticker");

  if (!memo) {
    const err = new Error("Memo not found");
    err.statusCode = 404;
    throw err;
  }
  return memo;
};

module.exports = { createMemo, listMemos, getMemoById, updateMemo, deleteMemo, publishMemo };