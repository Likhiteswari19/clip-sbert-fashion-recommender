import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getCart, removeFromCart, updateCartItem, checkout, addToCart } from "../services/api";
import Loading from "../components/Loading";

export default function Cart() {
  const { user } = useAuth();
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (user) loadCart();
  }, [user]);

  async function loadCart() {
    try {
      const r = await getCart();
      setCart(r.data || r);
    } catch (e) { /* ignore */ }
    setLoading(false);
  }

  const handleRemove = async (articleId) => {
    try {
      await removeFromCart(articleId);
      loadCart();
    } catch (e) { /* ignore */ }
  };

  const handleUpdate = async (articleId, quantity) => {
    try {
      await updateCartItem(articleId, quantity);
      loadCart();
    } catch (e) { /* ignore */ }
  };

  const handleCheckout = async () => {
    setCheckingOut(true);
    try {
      const r = await checkout();
      setMessage(r.message || "Checkout successful!");
      setCart({ items: [], totalItems: 0, totalPrice: 0 });
    } catch (e) {
      setMessage("Checkout failed: " + (e.response?.data?.message || e.message));
    }
    setCheckingOut(false);
  };

  const handleAddToWishlist = async (item) => {
    try {
      const { addWishlistItem } = await import("../services/api");
      await addWishlistItem({
        userId: user.id || user._id,
        articleId: item.articleId,
        productName: item.productName,
        productType: item.productType,
        colourGroup: item.colourGroup,
        imageUrl: item.imageUrl,
      });
    } catch (e) { /* ignore */ }
  };

  if (!user) return <div className="text-center py-16 text-gray-500">Please login to view your cart</div>;

  if (loading) return <Loading />;

  if (!cart || cart.items.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <h1 className="text-3xl font-bold mb-4">Your Cart</h1>
        <p className="text-gray-500 mb-6">Your cart is empty</p>
        <Link to="/products" className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700">Browse Products</Link>
      </div>
    );
  }

  const { items, totalItems, totalPrice } = cart;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">Your Cart</h1>
      {message && (
        <div className="bg-green-50 text-green-700 p-4 rounded-lg mb-4 animate-fade-in">{message}</div>
      )}
      <p className="text-gray-500 mb-6">{totalItems} items</p>

      {message && message.includes("successful") && (
        <div className="mb-8">
          <Link to="/products" className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700">Continue Shopping</Link>
        </div>
      )}

      <div className="space-y-4">
        {items.map(item => (
          <div key={item.articleId} className="bg-white rounded-xl p-4 shadow-sm flex gap-4 items-center">
            <div className="w-24 h-24 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
              <img src={item.imageUrl || "/placeholder.jpg"} alt={item.productName} className="w-full h-full object-cover" onError={(e) => { e.target.src = "/placeholder.jpg"; }} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-gray-900 truncate">{item.productName}</h3>
              <p className="text-sm text-gray-500">{item.productType} · {item.colourGroup}</p>
              <p className="text-sm text-gray-400">${(29.99 * item.quantity).toFixed(2)}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleUpdate(item.articleId, Math.max(1, item.quantity - 1))}
                className="w-8 h-8 bg-gray-100 rounded text-lg hover:bg-gray-200"
              >−</button>
              <span className="w-8 text-center font-medium">{item.quantity}</span>
              <button
                onClick={() => handleUpdate(item.articleId, item.quantity + 1)}
                className="w-8 h-8 bg-gray-100 rounded text-lg hover:bg-gray-200"
              >+</button>
            </div>
            <button onClick={() => handleRemove(item.articleId)} className="text-red-600 text-sm hover:text-red-700 px-2">Remove</button>
            <button
              onClick={() => handleAddToWishlist(item)}
              className="text-indigo-600 text-sm hover:text-indigo-700 px-2"
            >♡ Wishlist</button>
          </div>
        ))}
      </div>

      <div className="mt-8 bg-white rounded-xl p-6 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <span className="text-gray-500">Total: {totalItems} items</span>
          <span className="text-2xl font-bold">${totalPrice.toFixed(2)}</span>
        </div>
        <button
          onClick={handleCheckout}
          disabled={checkingOut}
          className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50"
        >
          {checkingOut ? "Processing..." : "Checkout"}
        </button>
      </div>
    </div>
  );
}
