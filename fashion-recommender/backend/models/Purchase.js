const mongoose = require("mongoose");

const purchaseSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  articleId: { type: String, required: true },
  productName: { type: String },
  productType: { type: String },
  department: { type: String },
  section: { type: String },
  colourGroup: { type: String },
  productGroup: { type: String },
  imageUrl: { type: String },
  purchaseDate: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Purchase", purchaseSchema);
