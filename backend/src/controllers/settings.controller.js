const settingsService = require("../services/settings.service");

const get = async (req, res) => {
  try {
    const settings = await settingsService.getSettings(req.user.userId);
    res.json(settings);
  } catch (err) {
    const status = err.statusCode || 500;
    res.status(status).json({ message: err.message });
  }
};

const update = async (req, res) => {
  try {
    const settings = await settingsService.updateSettings(req.user.userId, req.body);
    res.json(settings);
  } catch (err) {
    const status = err.statusCode || 500;
    res.status(status).json({ message: err.message });
  }
};

module.exports = { get, update };