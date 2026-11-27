const mongoose = require("mongoose");

const wishlistSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  articleId: { type: String, required: true },
  productName: { type: String },
  productType: { type: String },
  colourGroup: { type: String },
  imageUrl: { type: String },
  addedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Wishlist", wishlistSchema);
