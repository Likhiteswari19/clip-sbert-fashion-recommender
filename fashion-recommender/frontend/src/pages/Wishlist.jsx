import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getWishlist, removeWishlistItem, createPurchase } from "../services/api";
import ProductCard from "../components/ProductCard";
import Loading from "../components/Loading";

export default function WishlistPage() {
  const { user } = useAuth();
  const userId = user?.id || user?._id;
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && userId) loadWishlist();
  }, [user, userId]);

  async function loadWishlist() {
    try {
      const r = await getWishlist(userId);
      setItems(r.data.items || []);
    } catch (e) { /* ignore */ }
    setLoading(false);
  }

  const handleRemove = async (articleId) => {
    if (!userId) return;
    try {
      await removeWishlistItem(userId, articleId);
      setItems(prev => prev.filter(i => i.articleId !== articleId));
    } catch (e) { /* ignore */ }
  };

  const handlePurchase = async (item) => {
    if (!userId) return;
    try {
      await createPurchase({
        userId,
        articleId: item.articleId,
        productName: item.productName,
        productType: item.productType,
        department: item.department,
        section: item.section,
        colourGroup: item.colourGroup,
        productGroup: item.productGroup,
        imageUrl: item.imageUrl,
      });
      handleRemove(item.articleId);
    } catch (e) { /* ignore */ }
  };

  if (!user) return <div className="text-center py-16 text-gray-500">Please login to view your wishlist</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">My Wishlist</h1>
      {loading ? <Loading /> : items.length === 0 ? (
        <div className="text-center py-16 text-gray-500">Your wishlist is empty</div>
      ) : (
        <>
          <p className="text-gray-500 mb-4">{items.length} items</p>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {items.map(item => (
              <div key={item._id} className="bg-white rounded-xl overflow-hidden shadow-sm relative">
                <Link to={`/product/${item.articleId}`}>
                  <div className="aspect-square bg-gray-200 overflow-hidden">
                    <img src={item.imageUrl || "/placeholder.jpg"} alt={item.productName} className="w-full h-full object-cover" onError={(e) => { e.target.src = "/placeholder.jpg"; }} />
                  </div>
                  <div className="p-3">
                    <h3 className="font-medium text-gray-900 truncate text-sm">{item.productName}</h3>
                    <p className="text-sm text-gray-500">{item.productType}</p>
                    <p className="text-sm text-gray-400">{item.colourGroup}</p>
                  </div>
                </Link>
                <div className="flex gap-1 p-2 pt-0">
                  <button onClick={() => handlePurchase(item)} className="flex-1 text-xs py-1.5 bg-green-100 text-green-700 rounded hover:bg-green-200">Buy Now</button>
                  <button onClick={() => handleRemove(item.articleId)} className="flex-1 text-xs py-1.5 bg-red-50 text-red-600 rounded hover:bg-red-100">Remove</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
