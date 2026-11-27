const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const config = require("../config/db");

async function createAdmin() {
  await mongoose.connect(config.mongoUri);
  console.log("Connected to MongoDB");

  const existing = await User.findOne({ email: "admin@fashionai.com" });
  if (existing) {
    console.log("Admin already exists");
    await mongoose.disconnect();
    return;
  }

  const hash = await bcrypt.hash("admin123", 10);
  const admin = new User({
    name: "Admin",
    email: "admin@fashionai.com",
    passwordHash: hash,
    role: "ADMIN",
  });
  await admin.save();
  console.log("Admin created: admin@fashionai.com / admin123");

  await mongoose.disconnect();
}

createAdmin().catch(e => { console.error(e); process.exit(1); });
