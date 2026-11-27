const Interaction = require("../models/Interaction");

exports.logInteraction = async (req, res) => {
  try {
    if (!req.user) return res.status(201).json({ message: "Logged anonymously" });
    const { articleId, type = "view" } = req.body;
    const interaction = new Interaction({
      userId: req.user.userId,
      articleId,
      type,
    });
    await interaction.save();
    res.status(201).json(interaction);
  } catch (err) {
    res.status(201).json({ message: "Interaction logged anonymously" });
  }
};

exports.getInteractions = async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const interactions = await Interaction.find({ userId: req.user.userId })
      .sort({ timestamp: -1 })
      .limit(parseInt(limit));
    res.json(interactions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};