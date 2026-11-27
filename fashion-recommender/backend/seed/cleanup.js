const mongoose = require("mongoose");
const User = require("../models/User");
const Product = require("../models/Product");
const Purchase = require("../models/Purchase");
const Wishlist = require("../models/Wishlist");
const config = require("../config/db");

async function cleanup() {
  await mongoose.connect(config.mongoUri);
  console.log("Connected to MongoDB");

  const userEmails = [
    "test1@fashionai.com", "test2@fashionai.com", "test3@fashionai.com",
    "test4@fashionai.com", "test5@fashionai.com", "admin@fashionai.com"
  ];

  const users = await User.find({ email: { $in: userEmails } });
  const userIds = users.map(u => u._id);
  console.log(`Found ${users.length} test users`);

  await Wishlist.deleteMany({ userId: { $in: userIds } });
  console.log("Cleared wishlists");

  await Purchase.deleteMany({ userId: { $in: userIds } });
  console.log("Cleared purchases");

  const userIdsStr = userIds.map(id => id.toString());
  await User.deleteMany({ email: { $in: userEmails } });
  console.log("Deleted test users and admin");

  const newProducts = await Product.find({ isNew: true });
  console.log(`Found ${newProducts.length} new products to remove`);
  if (newProducts.length > 0) {
    const productIds = newProducts.map(p => p._id);
    await Product.deleteMany({ _id: { $in: productIds } });
    console.log("Deleted new products");
  }

  console.log("\n=== Cleanup Complete ===");

  const remainingUsers = await User.countDocuments();
  const remainingProducts = await Product.countDocuments();
  const remainingPurchases = await Purchase.countDocuments();
  const remainingWishlists = await Wishlist.countDocuments();
  console.log(`Remaining users: ${remainingUsers}`);
  console.log(`Remaining products: ${remainingProducts}`);
  console.log(`Remaining purchases: ${remainingPurchases}`);
  console.log(`Remaining wishlists: ${remainingWishlists}`);

  await mongoose.disconnect();
}

cleanup().catch(e => { console.error(e); process.exit(1); });
