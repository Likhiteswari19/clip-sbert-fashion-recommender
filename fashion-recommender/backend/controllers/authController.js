const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const config = require("../config/db");

exports.register = async (req, res) => {
  try {
    const { name, email, password, customerId, role } = req.body;
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: "Email already registered" });
    const passwordHash = await bcrypt.hash(password, 10);
    const user = new User({ name, email, passwordHash, customerId: customerId || null, role: role || "USER" });
    await user.save();
    const token = jwt.sign({ userId: user._id, email: user.email, role: user.role }, config.jwtSecret, { expiresIn: "7d" });
    res.status(201).json({ user: { id: user._id, name, email, customerId: user.customerId, role: user.role }, token });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: "Invalid credentials" });
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ message: "Invalid credentials" });
    const token = jwt.sign({ userId: user._id, email: user.email, role: user.role }, config.jwtSecret, { expiresIn: "7d" });
    res.json({ user: { id: user._id, name: user.name, email: user.email, customerId: user.customerId, role: user.role }, token });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.me = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("-passwordHash");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ user: { id: user._id, name: user.name, email: user.email, customerId: user.customerId, role: user.role }, token: null });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email, role: "ADMIN" });
    if (!user) return res.status(401).json({ message: "Invalid admin credentials" });
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ message: "Invalid admin credentials" });
    const token = jwt.sign({ userId: user._id, email: user.email, role: user.role }, config.jwtSecret, { expiresIn: "7d" });
    res.json({ user: { id: user._id, name: user.name, email: user.email, role: user.role }, token });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getUsers = async (req, res) => {
  try {
    const users = await User.find().select("-passwordHash").sort({ createdAt: -1 });
    res.json({ users });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    if (!["USER", "ADMIN"].includes(role)) return res.status(400).json({ message: "Invalid role" });
    const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true }).select("-passwordHash");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ message: "User deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
