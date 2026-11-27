const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const path = require("path");
const config = require("./config/db");

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use("/images", express.static(path.join(__dirname, "..", "..", "capstone_data", "images")));

mongoose.connect(config.mongoUri)
  .then(() => console.log("Connected to MongoDB"))
  .catch(err => console.error("MongoDB connection error:", err));

app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/products", require("./routes/productRoutes"));
app.use("/api/recommendations", require("./routes/recommendationRoutes"));
app.use("/api/purchases", require("./routes/purchasesRoutes"));
app.use("/api/wishlist", require("./routes/wishlistRoutes"));
app.use("/api/search", require("./routes/searchRoutes"));
app.use("/api/interactions", require("./routes/interactionRoutes"));
app.use("/api/cart", require("./routes/cartRoutes"));

app.get("/api/ai-health", async (req, res) => {
  try {
    const axios = require("axios");
    const r = await axios.get(`${config.aiServiceUrl}/health`, { timeout: 5000 });
    res.json(r.data);
  } catch {
    res.status(503).json({ status: "ai_service_down" });
  }
});

app.listen(config.port, () => console.log(`Backend running on port ${config.port}`));
