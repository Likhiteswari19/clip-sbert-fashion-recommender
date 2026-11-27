const express = require("express");
const router = express.Router();
const productController = require("../controllers/mainController");
const adminAuth = require("../middleware/adminAuth");

router.get("/", productController.getProducts);
router.get("/:articleId", productController.getProduct);
router.post("/", adminAuth, productController.addProduct);
router.put("/:articleId", adminAuth, productController.updateProduct);
router.delete("/:articleId", adminAuth, productController.deleteProduct);
router.get("/new", productController.getNewProducts);

module.exports = router;
