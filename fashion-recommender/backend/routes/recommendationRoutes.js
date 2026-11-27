const express = require("express");
const router = express.Router();
const adminController = require("../controllers/mainController");
const adminAuth = require("../middleware/adminAuth");
const userAuth = require("../middleware/authMiddleware");

router.get("/for-you/:userId", userAuth, adminController.getRecommendations);
router.get("/products/embeddings/:articleId", adminAuth, adminController.getProductEmbeddings);
router.get("/:articleId/similar", userAuth, adminController.getSimilarProducts);
module.exports = router;
