const cartService = require("../services/cartService");

exports.addToCart = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Not authenticated" });
    const { articleId, quantity = 1 } = req.body;
    const result = await cartService.addItem(req.user.userId, articleId, quantity);
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getCart = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Not authenticated" });
    const cart = await cartService.getCart(req.user.userId);
    res.json(cart);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.removeFromCart = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Not authenticated" });
    const { articleId } = req.params;
    await cartService.removeItem(req.user.userId, articleId);
    res.json({ message: "Removed from cart" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateCartItem = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Not authenticated" });
    const { articleId } = req.params;
    const { quantity } = req.body;
    await cartService.updateItem(req.user.userId, articleId, quantity);
    res.json({ message: "Cart updated" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.checkout = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Not authenticated" });
    const result = await cartService.checkout(req.user.userId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
