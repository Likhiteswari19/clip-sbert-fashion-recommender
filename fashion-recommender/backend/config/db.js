module.exports = {
  mongoUri: process.env.MONGO_URI || "mongodb://127.0.0.1:27017/fashion_recommender",
  aiServiceUrl: process.env.AI_SERVICE_URL || "http://127.0.0.1:8000",
  port: process.env.PORT || 3000,
  jwtSecret: process.env.JWT_SECRET || "fashion-recommender-secret-key-change-me",
};
