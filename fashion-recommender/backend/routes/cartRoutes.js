const express = require("express");
const router = express.Router();
const cartController = require("../controllers/cartController");
const userAuth = require("../middleware/authMiddleware");

router.post("/", userAuth, cartController.addToCart);
router.get("/", userAuth, cartController.getCart);
router.delete("/:articleId", userAuth, cartController.removeFromCart);
router.put("/:articleId", userAuth, cartController.updateCartItem);
router.post("/checkout", userAuth, cartController.checkout);

module.exports = router;
