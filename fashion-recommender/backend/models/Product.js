const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  articleId: { type: String, unique: true, required: true },
  productCode: { type: String },
  productName: { type: String },
  productType: { type: String },
  productGroup: { type: String },
  department: { type: String },
  section: { type: String },
  colourGroup: { type: String },
  perceivedColourValue: { type: String },
  perceivedColourMaster: { type: String },
  garmentGroup: { type: String },
  detailDesc: { type: String },
  customerCount: { type: Number },
  imageUrl: { type: String },
  productText: { type: String },
  isNew: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  clipEmbedding: { type: [Number], default: null },
  sbertEmbedding: { type: [Number], default: null },
});

module.exports = mongoose.model("Product", productSchema);
