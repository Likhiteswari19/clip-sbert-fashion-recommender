const express = require("express");
const router = express.Router();
const adminController = require("../controllers/mainController");
const adminAuth = require("../middleware/adminAuth");
const userAuth = require("../middleware/authMiddleware");

router.get("/:userId", userAuth, adminController.getUserWishlist);
router.post("/", userAuth, adminController.addWishlistItem);
router.delete("/:userId/:articleId", userAuth, adminController.removeWishlistItem);

module.exports = router;
