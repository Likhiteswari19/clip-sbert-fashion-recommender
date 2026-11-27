const interactionController = require("../controllers/interactionController");
const requireAuth = require("../middleware/authMiddleware");
const express = require("express");
const router = express.Router();
router.post("/", interactionController.logInteraction);
router.get("/", requireAuth, interactionController.getInteractions);
module.exports = router;