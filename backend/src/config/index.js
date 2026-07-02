require("dotenv").config();

module.exports = {
  port: parseInt(process.env.PORT, 10) || 3000,
  mongo: {
    uri: process.env.MONGO_URI || "mongodb://localhost:27017/venorse",
  },
  jwt: {
    secret: process.env.JWT_SECRET || "fallback-secret",
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  },
  agent: {
  url: (process.env.AGENT_URL || "").trim() || "https://localhost:8000",
}
};

