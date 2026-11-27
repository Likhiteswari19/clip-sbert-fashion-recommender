const mongoose = require("mongoose");

const interactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  articleId: { type: String, required: true },
  type: { type: String, enum: ["view", "like", "click"], default: "view" },
  timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Interaction", interactionSchema);