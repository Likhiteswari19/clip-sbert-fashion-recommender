const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const adminAuth = require("../middleware/adminAuth");

router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/admin/login", authController.loginAdmin);
router.get("/me", require("../middleware/authMiddleware"), authController.me);
router.get("/users", adminAuth, authController.getUsers);
router.put("/users/:id/role", adminAuth, authController.updateUserRole);
router.delete("/users/:id", adminAuth, authController.deleteUser);

module.exports = router;
