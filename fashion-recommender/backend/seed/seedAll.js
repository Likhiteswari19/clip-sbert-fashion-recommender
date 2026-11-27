const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Product = require("../models/Product");
const Purchase = require("../models/Purchase");
const Wishlist = require("../models/Wishlist");
const config = require("../config/db");

const ADMIN_EMAIL = "admin@fashionai.com";
const ADMIN_PASSWORD = "admin123";

const TEST_USERS = [
  { name: "Test User 1", email: "test1@fashionai.com", password: "test123" },
  { name: "Test User 2", email: "test2@fashionai.com", password: "test123" },
  { name: "Test User 3", email: "test3@fashionai.com", password: "test123" },
  { name: "Test User 4", email: "test4@fashionai.com", password: "test123" },
  { name: "Test User 5", email: "test5@fashionai.com", password: "test123" },
];

async function seed() {
  await mongoose.connect(config.mongoUri);
  console.log("Connected to MongoDB");

  await User.deleteMany({ email: { $in: [ADMIN_EMAIL, ...TEST_USERS.map(u => u.email)] } });
  await Purchase.deleteMany({});
  await Wishlist.deleteMany({});
  console.log("Cleared existing test data");

  const products = await Product.find().limit(500).lean();
  console.log(`Found ${products.length} products for seeding`);

  const admin = new User({
    name: "Admin", email: ADMIN_EMAIL,
    passwordHash: await bcrypt.hash(ADMIN_PASSWORD, 10),
    role: "ADMIN",
  });
  await admin.save();
  console.log(`Seeded admin: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);

  const userCustomerIds = [];
  for (const u of TEST_USERS) {
    const customerId = "9903a25eda62787e7f5801493a680085ae4d7a0bf3caa5639419493e81962be" + Math.floor(Math.random() * 1000000).toString().padStart(6, "0");
    const user = new User({
      name: u.name, email: u.email,
      passwordHash: await bcrypt.hash(u.password, 10),
      customerId, role: "USER",
    });
    await user.save();
    userCustomerIds.push({ userId: user._id.toString(), customerId, email: u.email });
    console.log(`Seeded: ${u.name} (${u.email})`);
  }

  const shuffled = [...products].sort(() => Math.random() - 0.5);

  for (let i = 0; i < userCustomerIds.length; i++) {
    const { userId, email } = userCustomerIds[i];
    const numPurchases = 2 + Math.floor(Math.random() * 3);
    const userProducts = shuffled.slice(i * 30, i * 30 + numPurchases);

    for (const p of userProducts) {
      const purchase = new Purchase({
        userId,
        articleId: p.articleId,
        productName: p.productName,
        productType: p.productType,
        department: p.department,
        section: p.section,
        colourGroup: p.colourGroup,
        productGroup: p.productGroup,
        imageUrl: p.imageUrl,
        purchaseDate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
      });
      await purchase.save();
    }
    console.log(`User ${email}: ${numPurchases} purchases seeded`);
  }

  console.log("\n=== Seed Complete ===");
  console.log(`Admin: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
  TEST_USERS.forEach(u => console.log(`  ${u.email} / ${u.password}`));

  await mongoose.disconnect();
}

seed().catch(e => { console.error(e); process.exit(1); });
