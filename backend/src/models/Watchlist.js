const mongoose = require("mongoose");

const WatchlistSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "Users", required: true },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Companies", required: true },
  },
  { timestamps: true }
);

WatchlistSchema.index({ userId: 1, companyId: 1 }, { unique: true });

const watchlistModel = mongoose.model("Watchlists", WatchlistSchema);

module.exports = watchlistModel;
