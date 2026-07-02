const settingsModel = require("../models/Settings");

const getSettings = async (userId) => {
  let settings = await settingsModel.findOne({ userId });
  if (!settings) {
    settings = await settingsModel.create({ userId });
  }
  return settings;
};

const updateSettings = async (userId, updates) => {
  const allowed = ["theme", "notifications"];
  const filtered = {};
  for (const key of allowed) {
    if (updates[key] !== undefined) filtered[key] = updates[key];
  }

  const settings = await settingsModel
    .findOneAndUpdate({ userId }, { $set: filtered }, { upsert: true, new: true, runValidators: true });

  return settings;
};

module.exports = { getSettings, updateSettings };