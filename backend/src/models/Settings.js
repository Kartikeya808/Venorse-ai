const mongoose = require("mongoose");

const SettingsSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "Users", required: true, unique: true },
    theme: { type: String, enum: ["light", "dark"], default: "light" },
    notifications: {
      email: { type: Boolean, default: true },
      researchComplete: { type: Boolean, default: true },
    },
  },
  { timestamps: true }
);

const settingsModel = mongoose.model("Settings", SettingsSchema);

module.exports = settingsModel;
