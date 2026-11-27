const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const config = require("../config/db");

const DEMO_USERS = [
  { name: "Alice Johnson", email: "alice@example.com", password: "password123", customerId: "9903a25eda62787e7f5801493a680085ae4d7a0bf3caa5639419493e81962be6" },
  { name: "Bob Smith", email: "bob@example.com", password: "password123", customerId: "9903a25eda62787e7f5801493a680085ae4d7a0bf3caa5639419493e81962be7" },
  { name: "Carol White", email: "carol@example.com", password: "password123", customerId: "9903a25eda62787e7f5801493a680085ae4d7a0bf3caa5639419493e81962be8" },
  { name: "Dave Brown", email: "dave@example.com", password: "password123", customerId: "9903a25eda62787e7f5801493a680085ae4d7a0bf3caa5639419493e81962be9" },
  { name: "Eve Davis", email: "eve@example.com", password: "password123", customerId: "9903a25eda62787e7f5801493a680085ae4d7a0bf3caa5639419493e81962bea" },
];

async function seed() {
  await mongoose.connect(config.mongoUri);
  console.log("Connected to MongoDB");

  await User.deleteMany({});
  console.log("Cleared existing users");

  for (const u of DEMO_USERS) {
    const hash = await bcrypt.hash(u.password, 10);
    const user = new User({ name: u.name, email: u.email, passwordHash: hash, customerId: u.customerId });
    await user.save();
    const token = jwt.sign({ userId: user._id, email: user.email }, config.jwtSecret, { expiresIn: "7d" });
    console.log(`Seeded: ${u.name} (${u.email}) | customerId: ${u.customerId} | token: ${token.substring(0, 20)}...`);
  }

  console.log(`\nSeeded ${DEMO_USERS.length} demo users`);
  console.log("Login credentials:");
  DEMO_USERS.forEach(u => console.log(`  ${u.email} / ${u.password}`));

  await mongoose.disconnect();
}

seed().catch(e => { console.error(e); process.exit(1); });
