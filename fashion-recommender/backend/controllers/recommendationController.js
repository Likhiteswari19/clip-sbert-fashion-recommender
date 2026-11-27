const recommendationService = require("../services/recommendationService");

exports.getRecommendations = async (req, res) => {
  try {
    const { customerId } = req.params;
    const result = await recommendationService.aiPost(`/api/recommendations`, { customer_id: customerId });
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getSimilarProducts = async (req, res) => {
  try {
    const { articleId } = req.params;
    const result = await recommendationService.aiPost(`/api/similar`, { article_id: articleId });
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};