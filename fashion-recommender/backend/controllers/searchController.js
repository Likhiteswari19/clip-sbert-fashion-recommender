const productService = require("../services/productService");

exports.search = async (req, res) => {
  try {
    const { q = "", page = 1, limit = 20 } = req.query;
    const result = await productService.searchProducts(q, parseInt(page), parseInt(limit));
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};