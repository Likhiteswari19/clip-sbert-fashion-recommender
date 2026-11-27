const productService = require("../services/productService");

exports.getProducts = async (req, res) => {
  try {
    const { page = 1, limit = 20, category = "" } = req.query;
    const result = await productService.getProductsList(parseInt(page), parseInt(limit), category);
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getProduct = async (req, res) => {
  try {
    const product = await productService.getProductByArticleId(req.params.articleId);
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};