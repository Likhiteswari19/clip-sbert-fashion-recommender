const Cart = require("../models/Cart");
const Product = require("../models/Product");

async function addItem(userId, articleId, quantity) {
  let cart = await Cart.findOne({ userId });
  if (!cart) {
    cart = new Cart({ userId, items: [] });
  }

  const existing = cart.items.find(item => item.articleId === articleId);
  if (existing) {
    existing.quantity += quantity;
  } else {
    const product = await Product.findOne({ articleId });
    cart.items.push({
      articleId,
      productName: product?.productName || articleId,
      productType: product?.productType || "",
      colourGroup: product?.colourGroup || "",
      imageUrl: product?.imageUrl || `/images/${articleId}.jpg`,
      quantity,
    });
  }

  cart.updatedAt = new Date();
  await cart.save();
  return cart;
}

async function getCart(userId) {
  let cart = await Cart.findOne({ userId }).populate("userId", "name email");
  if (!cart) {
    cart = new Cart({ userId, items: [] });
  }
  const items = cart.items;
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce((sum, item) => sum + (item.quantity * 29.99), 0);
  return { items, totalItems, totalPrice, itemCount: items.length };
}

async function removeItem(userId, articleId) {
  const cart = await Cart.findOne({ userId });
  if (!cart) return;
  cart.items = cart.items.filter(item => item.articleId !== articleId);
  cart.updatedAt = new Date();
  await cart.save();
}

async function updateItem(userId, articleId, quantity) {
  const cart = await Cart.findOne({ userId });
  if (!cart) return;
  const item = cart.items.find(item => item.articleId === articleId);
  if (item) {
    if (quantity <= 0) {
      cart.items = cart.items.filter(i => i.articleId !== articleId);
    } else {
      item.quantity = quantity;
    }
    cart.updatedAt = new Date();
    await cart.save();
  }
}

async function checkout(userId) {
  const cart = await Cart.findOne({ userId });
  if (!cart || cart.items.length === 0) {
    return { error: "Cart is empty" };
  }

  const purchases = cart.items.map(item => ({
    userId,
    articleId: item.articleId,
    productName: item.productName,
    productType: item.productType,
    department: "",
    section: "",
    colourGroup: item.colourGroup,
    productGroup: "",
    imageUrl: item.imageUrl,
    purchaseDate: new Date(),
  }));

  const Purchase = require("../models/Purchase");
  await Purchase.insertMany(purchases);

  await Cart.deleteOne({ userId });

  return { message: "Payment successful! Order placed.", orderTotal: cart.items.reduce((sum, i) => sum + (i.quantity * 29.99), 0) };
}

module.exports = { addItem, getCart, removeItem, updateItem, checkout };
