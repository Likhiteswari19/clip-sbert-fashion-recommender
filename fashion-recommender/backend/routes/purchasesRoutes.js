const express = require("express");
const router = express.Router();
const adminController = require("../controllers/mainController");
const adminAuth = require("../middleware/adminAuth");
const userAuth = require("../middleware/authMiddleware");

router.get("/", userAuth, adminController.getPurchases);
router.post("/", userAuth, adminController.createPurchase);
router.get("/:userId", userAuth, adminController.getUserPurchases);

module.exports = router;
