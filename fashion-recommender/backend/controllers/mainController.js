const Product = require("../models/Product");
const Purchase = require("../models/Purchase");
const Wishlist = require("../models/Wishlist");
const User = require("../models/User");
const axios = require("axios");
const config = require("../config/db");

const PAGE_SIZE = 20;

exports.getProducts = async (req, res) => {
  try {
    const { page = 1, limit = PAGE_SIZE, category = "" } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    let query = {};
    if (category && category !== "All") {
      const catMap = {
        Women: ["womens", "women", "lady"], Men: ["mens", "men"],
        Kids: ["kids", "kid", "baby", "girl", "boy"],
        Accessories: ["accessories", "bag", "hat", "scarf", "belt", "watch", "jewelry", "hair"],
        Shoes: ["shoes", "shoe", "boot", "sneaker", "sandal", "heel", "loafer", "pump", "trainer"],
      };
      const keywords = catMap[category] || [];
      if (keywords.length > 0) {
        const orConditions = keywords.map(kw => ({
          $or: [
            { productType: { $regex: `\\b${kw}\\w*`, $options: "i" } },
            { productGroup: { $regex: `\\b${kw}\\w*`, $options: "i" } },
            { section: { $regex: `\\b${kw}\\w*`, $options: "i" } },
            { department: { $regex: `\\b${kw}\\w*`, $options: "i" } },
          ],
        }));
        query = { $or: orConditions };
      }
    }
    const [total, products] = await Promise.all([
      Product.countDocuments(query),
      Product.find(query).skip(skip).limit(parseInt(limit)).sort({ createdAt: -1 }),
    ]);
    res.json({ products, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getProduct = async (req, res) => {
  try {
    const aid = String(req.params.articleId).trim().padStart(10, "0");
    const product = await Product.findOne({ articleId: aid });
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.addProduct = async (req, res) => {
  try {
    const { productCode, productName, productType, productGroup, department, section, colourGroup, perceivedColourValue, perceivedColourMaster, garmentGroup, detailDesc, customerCount, productText, imageUrl, clipEmbedding, sbertEmbedding } = req.body;
    const articleId = `NEW${Date.now().toString().slice(-10)}`;
    const product = new Product({
      articleId, productCode, productName, productType, productGroup, department, section, colourGroup,
      perceivedColourValue, perceivedColourMaster, garmentGroup, detailDesc, customerCount, productText,
      imageUrl, clipEmbedding: clipEmbedding || null, sbertEmbedding: sbertEmbedding || null, isNew: true, createdAt: new Date(),
    });
    await product.save();
    res.status(201).json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const product = await Product.findOneAndUpdate({ articleId: req.params.articleId }, req.body, { new: true });
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findOneAndDelete({ articleId: req.params.articleId });
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json({ message: "Product deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getNewProducts = async (req, res) => {
  try {
    const products = await Product.find({ isNew: true }).sort({ createdAt: -1 }).limit(50);
    res.json({ products });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getPurchases = async (req, res) => {
  try {
    const { userId } = req.query;
    let query = {};
    if (userId) query.userId = userId;
    const purchases = await Purchase.find(query).sort({ purchaseDate: -1 }).limit(100);
    res.json({ purchases });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.createPurchase = async (req, res) => {
  try {
    const { userId, articleId, productName, productType, department, section, colourGroup, productGroup, imageUrl } = req.body;
    const existing = await Purchase.findOne({ userId, articleId });
    if (existing) return res.status(409).json({ message: "Already purchased" });
    const purchase = new Purchase({
      userId, articleId, productName, productType, department, section, colourGroup, productGroup, imageUrl, purchaseDate: new Date(),
    });
    await purchase.save();
    res.status(201).json(purchase);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getUserPurchases = async (req, res) => {
  try {
    const purchases = await Purchase.find({ userId: req.params.userId }).sort({ purchaseDate: -1 });
    res.json({ purchases });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.addWishlistItem = async (req, res) => {
  try {
    const { userId, articleId, productName, productType, colourGroup, imageUrl } = req.body;
    const existing = await Wishlist.findOne({ userId, articleId });
    if (existing) return res.status(409).json({ message: "Already in wishlist" });
    const item = new Wishlist({ userId, articleId, productName, productType, colourGroup, imageUrl });
    await item.save();
    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.removeWishlistItem = async (req, res) => {
  try {
    const { userId, articleId } = req.params;
    const result = await Wishlist.deleteOne({ userId, articleId });
    if (result.deletedCount === 0) return res.status(404).json({ message: "Not in wishlist" });
    res.json({ message: "Removed from wishlist" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getUserWishlist = async (req, res) => {
  try {
    const items = await Wishlist.find({ userId: req.params.userId }).sort({ addedAt: -1 });
    res.json({ items });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getRecommendations = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const axios = require("axios");
    const r = await axios.post(
      `${config.aiServiceUrl}/api/recommendations`,
      { customer_id: user.customerId || userId.toString(), top_k: 20 },
      { timeout: 15000 }
    );
    const recs = (r.data && r.data.recommendations) || [];
    const purchaseIds = new Set(
      (await Purchase.find({ userId }).select("articleId").lean()).map(p => p.articleId)
    );
    const mapped = recs.map((p, idx) => ({
      ...p,
      articleId: p.article_id || p.articleId,
      productName: p.product_name || p.productName,
      productType: p.product_type || p.productType,
      productGroup: p.product_group || p.productGroup,
      department: p.department || p.department_name,
      colourGroup: p.colour || p.colourGroup,
      imageUrl: p.image_url || p.imageUrl,
      score: p.score || 0,
      rank: p.rank || idx + 1,
      isNew: false,
      purchased: purchaseIds.has(p.article_id || p.articleId),
    }));
    res.json({ recommendations: mapped, count: mapped.length });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getProductEmbeddings = async (req, res) => {
  try {
    const aid = String(req.params.articleId).trim().padStart(10, "0");
    const product = await Product.findOne({ articleId: aid }).select("clipEmbedding sbertEmbedding articleId");
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json({
      articleId: product.articleId,
      clipEmbedding: product.clipEmbedding,
      sbertEmbedding: product.sbertEmbedding,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getSimilarProducts = async (req, res) => {
  try {
    const aid = String(req.params.articleId).trim().padStart(10, "0");
    const axios = require("axios");
    const r = await axios.post(
      `${config.aiServiceUrl}/api/similar`,
      { article_id: aid, top_k: 8 },
      { timeout: 10000 }
    );
    const similar = (r.data && r.data.similar_products) || [];
    const mapped = similar.map((p) => ({
      ...p,
      articleId: p.article_id || p.articleId,
      productName: p.product_name || p.productName,
      productType: p.product_type || p.productType,
      productGroup: p.product_group || p.productGroup,
      department: p.department || p.department_name,
      colourGroup: p.colour || p.colourGroup,
      imageUrl: p.image_url || p.imageUrl,
      score: p.score || 0,
      rank: p.rank || 0,
    }));
    const filtered = mapped.filter((p) => p.articleId !== aid);
    res.json({ similar_products: filtered });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
