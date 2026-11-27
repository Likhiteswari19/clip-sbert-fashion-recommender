import { getRecommendations } from "../services/api";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Loading from "../components/Loading";

export default function Recommendations() {
  const { user } = useAuth();
  const [customerId, setCustomerId] = useState(user?.customerId || "");
  const [results, setResults] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!customerId.trim()) { setError("Please enter a customer ID"); return; }
    setLoading(true); setError(""); setResults(null);
    try {
      const r = await getRecommendations(customerId.trim());
      const data = r.data || r;
      if (data.recommendations && data.recommendations.length > 0) {
        setResults(data);
      } else {
        setError(data.message || "No recommendations found for this user");
      }
    } catch (err) {
      setError("Failed to get recommendations. Is the backend running?");
    }
    setLoading(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">Recommended For You</h1>
      <p className="text-gray-500 mb-6">Enter your H&M customer ID to get personalized recommendations</p>
      <form onSubmit={handleSubmit} className="mb-8">
        <div className="flex gap-2">
          <input
            type="text"
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            placeholder="9903a25eda62787e7f5801493a680085ae4d7a0bf3caa5639419493e81962be6"
            className="flex-1 px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
          />
          <button type="submit" disabled={loading} className="bg-indigo-600 text-white px-8 py-3 rounded-lg hover:bg-indigo-700 disabled:opacity-50">
            {loading ? "Loading..." : "Get Recommendations"}
          </button>
        </div>
      </form>
      {error && <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6">{error}</div>}
      {loading && <Loading text="Generating recommendations..." />}
      {results && results.recommendations && (
        <div className="animate-fade-in">
          <h2 className="text-xl font-bold mb-4">Top {results.count} Recommendations</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {results.recommendations.map((p, i) => (
              <RecommendationCard key={p.article_id || p.articleId} product={p} rank={i + 1} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function RecommendationCard({ product, rank }) {
  const pid = product.article_id || product.articleId;
  return (
    <div className="bg-white rounded-xl overflow-hidden shadow-sm relative">
      <div className="absolute top-2 left-2 bg-indigo-600 text-white text-sm font-bold w-8 h-8 flex items-center justify-center rounded-full z-10">{rank}</div>
      <Link to={`/product/${pid}`}>
        <div className="aspect-square bg-gray-200">
          <img src={product.image_url || product.imageUrl || "/placeholder.jpg"} alt={product.product_name || product.productName || "Product"} className="w-full h-full object-cover" onError={(e) => { e.target.src = "/placeholder.jpg"; }} />
        </div>
        <div className="p-3">
          <h3 className="font-medium text-sm truncate">{product.product_name || product.productName || "Product"}</h3>
          <p className="text-xs text-gray-500">{product.product_type || product.productType || ""}</p>
          <p className="text-xs text-gray-400">{product.colour || product.colourGroup || ""}</p>
        </div>
      </Link>
    </div>
  );
}