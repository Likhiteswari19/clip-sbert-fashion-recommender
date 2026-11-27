import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getForYou, getProduct, createPurchase, addWishlistItem, removeWishlistItem } from "../services/api";
import ProductCard from "../components/ProductCard";
import Loading from "../components/Loading";

export default function ForYou() {
  const { user } = useAuth();
  const userId = user?.id || user?._id;
  const [recommendations, setRecommendations] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [purchasedIds, setPurchasedIds] = useState(new Set());
  const [wishlistIds, setWishlistIds] = useState(new Set());

  useEffect(() => {
    if (user && userId) {
      loadPurchased();
      loadWishlist();
      loadRecommendations();
    }
  }, [user, userId]);

  async function loadPurchased() {
    if (!userId) return;
    try {
      const r = await getPurchases(userId);
      const ids = new Set((r.data.purchases || []).map(p => p.articleId));
      setPurchasedIds(ids);
    } catch (e) { /* ignore */ }
  }

  async function loadWishlist() {
    if (!userId) return;
    try {
      const r = await getWishlist(userId);
      const ids = new Set((r.data.items || []).map(p => p.articleId));
      setWishlistIds(ids);
    } catch (e) { /* ignore */ }
  }

  async function loadRecommendations() {
    if (!user || !userId) return;
    setLoading(true);
    setError("");
    try {
      const r = await getForYou(userId);
      const data = r.data || r;
      if (data.recommendations && data.recommendations.length > 0) {
        setRecommendations(data);
      } else {
        setError(data.message || "No recommendations yet. Purchase some products first!");
      }
    } catch (err) {
      setError("Failed to load recommendations");
    }
    setLoading(false);
  }

  const handlePurchase = async (product) => {
    if (!userId) return;
    try {
      await createPurchase({
        userId,
        articleId: product.articleId || product.article_id,
        productName: product.productName || product.product_name,
        productType: product.productType || product.product_type,
        department: product.department,
        section: product.section,
        colourGroup: product.colourGroup || product.colour,
        productGroup: product.productGroup || product.product_group,
        imageUrl: product.imageUrl || product.image_url,
      });
      setPurchasedIds(prev => new Set(prev).add(product.articleId || product.article_id));
      loadRecommendations();
    } catch (e) {
      alert("Purchase failed: " + (e.response?.data?.message || e.message));
    }
  };

  const handleWishlist = async (product) => {
    if (!userId) return;
    const articleId = product.articleId || product.article_id;
    if (wishlistIds.has(articleId)) {
      try {
        await removeWishlistItem(userId, articleId);
        setWishlistIds(prev => { const n = new Set(prev); n.delete(articleId); return n; });
      } catch (e) { /* ignore */ }
    } else {
      try {
        await addWishlistItem({
          userId,
          articleId,
          productName: product.productName || product.product_name,
          productType: product.productType || product.product_type,
          colourGroup: product.colourGroup || product.colour,
          imageUrl: product.imageUrl || product.image_url,
        });
        setWishlistIds(prev => new Set(prev).add(articleId));
      } catch (e) { /* ignore */ }
    }
  };

  const newProducts = recommendations?.recommendations?.filter(p => p.isNew) || [];
  const oldProducts = recommendations?.recommendations?.filter(p => !p.isNew) || [];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">For You</h1>
      <p className="text-gray-500 mb-6">Personalized recommendations based on your purchase history</p>
      {error && !recommendations && <div className="bg-yellow-50 text-yellow-700 p-4 rounded-lg mb-6">{error}</div>}

      {loading && <Loading text="Generating recommendations..." />}

      {recommendations && (
        <>
          <p className="text-gray-500 mb-4">{recommendations.count} recommendations found</p>
          {newProducts.length > 0 && (
            <div className="mb-8">
              <h2 className="text-xl font-bold mb-3">
                <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-sm mr-2">NEW</span>
                New Products
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {newProducts.map(p => (
                  <RecommendationCard key={p.articleId || p.article_id} product={p} purchased={purchasedIds.has(p.articleId || p.article_id)} wishlist={wishlistIds.has(p.articleId || p.article_id)} onPurchase={handlePurchase} onWishlist={handleWishlist} user={user} />
                ))}
              </div>
            </div>
          )}
          {oldProducts.length > 0 && (
            <div className="mb-8">
              <h2 className="text-xl font-bold mb-3">More Recommendations</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {oldProducts.map(p => (
                  <RecommendationCard key={p.articleId || p.article_id} product={p} purchased={purchasedIds.has(p.articleId || p.article_id)} wishlist={wishlistIds.has(p.articleId || p.article_id)} onPurchase={handlePurchase} onWishlist={handleWishlist} user={user} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function RecommendationCard({ product, purchased, wishlist, onPurchase, onWishlist, user }) {
  const articleId = product.articleId || product.article_id;
  const name = product.productName || product.product_name || "Product";
  const type = product.productType || product.productType || product.product_type || "";
  const colour = product.colourGroup || product.colour || product.colourGroup || "";
  const img = product.imageUrl || product.image_url || "/placeholder.jpg";

  return (
    <div className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow relative">
      {product.isNew && (
        <div className="absolute top-2 left-2 bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded z-10">NEW</div>
      )}
      {purchased && (
        <div className="absolute top-2 right-2 bg-blue-500 text-white text-xs font-bold px-2 py-0.5 rounded z-10">Purchased</div>
      )}
      <Link to={`/product/${articleId}`}>
        <div className="aspect-square bg-gray-200 overflow-hidden">
          <img src={img} alt={name} className="w-full h-full object-cover" onError={(e) => { e.target.src = "/placeholder.jpg"; }} />
        </div>
        <div className="p-3">
          <h3 className="font-medium text-gray-900 truncate text-sm">{name}</h3>
          <p className="text-sm text-gray-500">{type}</p>
          <p className="text-sm text-gray-400">{colour}</p>
        </div>
      </Link>
      {user && (
        <div className="flex gap-1 p-2 pt-0">
          <button
            onClick={() => onPurchase(product)}
            disabled={purchased}
            className={`flex-1 text-xs py-1.5 rounded ${purchased ? "bg-gray-100 text-gray-400" : "bg-green-100 text-green-700 hover:bg-green-200"}`}
          >
            {purchased ? "Purchased" : "Buy Now"}
          </button>
          <button
            onClick={() => onWishlist(product)}
            className={`flex-1 text-xs py-1.5 rounded ${wishlist ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
          >
            {wishlist ? "♥ Wishlisted" : "♡ Wishlist"}
          </button>
        </div>
      )}
    </div>
  );
}
