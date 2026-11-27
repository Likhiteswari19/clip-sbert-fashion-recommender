const mongoose = require("mongoose");
const Product = require("../models/Product");

const cartSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  items: [{
    articleId: { type: String, required: true },
    productName: { type: String },
    productType: { type: String },
    colourGroup: { type: String },
    imageUrl: { type: String },
    quantity: { type: Number, default: 1 },
    addedAt: { type: Date, default: Date.now },
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Cart", cartSchema);
