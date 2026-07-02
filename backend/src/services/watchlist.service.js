const watchlistModel = require("../models/Watchlist");
const companyModel = require("../models/Company");

const addCompany = async (userId, companyId) => {
  const company = await companyModel.findById(companyId);
  if (!company) {
    const err = new Error("Company not found");
    err.statusCode = 404;
    throw err;
  }

  const existing = await watchlistModel.findOne({ userId, companyId });
  if (existing) {
    const err = new Error("Company already in watchlist");
    err.statusCode = 409;
    throw err;
  }

  return watchlistModel.create({ userId, companyId });
};

const listWatchlist = async (userId) => {
  return watchlistModel
    .find({ userId })
    .populate("companyId")
    .sort("-createdAt");
};

const removeEntry = async (userId, entryId) => {
  const entry = await watchlistModel.findOneAndDelete({ _id: entryId, userId });
  if (!entry) {
    const err = new Error("Watchlist entry not found");
    err.statusCode = 404;
    throw err;
  }
  return { message: "Removed from watchlist" };
};

const checkWatched = async (userId, companyId) => {
  const entry = await watchlistModel.findOne({ userId, companyId });
  return { watched: !!entry };
};

module.exports = { addCompany, listWatchlist, removeEntry, checkWatched };