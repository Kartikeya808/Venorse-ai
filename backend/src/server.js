const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const config = require("./config");
const authRoutes = require("./routes/auth.routes");
const documentRoutes = require("./routes/document.routes");
const companyRoutes = require("./routes/company.routes");
const watchlistRoutes = require("./routes/watchlist.routes");
const jobRoutes = require("./routes/job.routes");
const memoRoutes = require("./routes/memo.routes");
const settingsRoutes = require("./routes/settings.routes");
const agentRoutes = require("./routes/agent.routes");
const webhookRoutes = require("./routes/webhook.routes");
const { errorHandler } = require("./middleware/error.middleware");

const app = express();

app.use(cors());
app.use(helmet());
app.use(morgan("dev"));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

app.use("/api/auth", authRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/companies", companyRoutes);
app.use("/api/watchlist", watchlistRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/memos", memoRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/agent", agentRoutes);
app.use("/api/webhooks", webhookRoutes);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use((_req, res) => {
  res.status(404).json({ message: "Not found" });
});

app.use(errorHandler);

mongoose
  .connect(config.mongo.uri)
  .then(() => {
    console.log("Connected to MongoDB");
    app.listen(config.port, () => {
      console.log(`Server running on port ${config.port}`);
    });
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });

module.exports = app;
