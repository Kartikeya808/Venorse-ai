const watchlistService = require("../services/watchlist.service");

const add = async (req, res) => {
  try {
    const entry = await watchlistService.addCompany(req.user.userId, req.body.companyId);
    res.status(201).json(entry);
  } catch (err) {
    const status = err.statusCode || 500;
    res.status(status).json({ message: err.message });
  }
};

const list = async (req, res) => {
  try {
    const entries = await watchlistService.listWatchlist(req.user.userId);
    res.json(entries);
  } catch (err) {
    const status = err.statusCode || 500;
    res.status(status).json({ message: err.message });
  }
};

const remove = async (req, res) => {
  try {
    const result = await watchlistService.removeEntry(req.user.userId, req.params.id);
    res.json(result);
  } catch (err) {
    const status = err.statusCode || 500;
    res.status(status).json({ message: err.message });
  }
};

const check = async (req, res) => {
  try {
    const result = await watchlistService.checkWatched(req.user.userId, req.params.companyId);
    res.json(result);
  } catch (err) {
    const status = err.statusCode || 500;
    res.status(status).json({ message: err.message });
  }
};

module.exports = { add, list, remove, check };