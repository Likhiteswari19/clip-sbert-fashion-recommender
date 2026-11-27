import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useState, useEffect } from "react";

export default function Navbar() {
  const { user, logout } = useAuth();
  const [show, setShow] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    async function loadCartCount() {
      if (!user) { setCartCount(0); return; }
      try {
        const { getCart } = await import("../services/api");
        const r = await getCart();
        const data = r.data || r;
        setCartCount(data.totalItems || 0);
      } catch (e) { /* ignore */ }
    }
    loadCartCount();
    const interval = setInterval(loadCartCount, 30000);
    return () => clearInterval(interval);
  }, [user, location.pathname]);

  return (
    <nav className="bg-white shadow-sm border-b sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex justify-between h-16 items-center">
          <Link to="/" className="text-2xl font-bold text-indigo-600">FashionAI</Link>
          <div className="flex items-center space-x-4">
            {user && (
              <Link to="/search" className="text-gray-700 hover:text-indigo-600">Search</Link>
            )}
            {user && <Link to="/for-you" className="text-gray-700 hover:text-indigo-600">For You</Link>}
            {user && user.role === "ADMIN" && (
              <Link to="/admin" className="text-red-600 hover:text-red-700 font-medium">Admin</Link>
            )}
            {user && <Link to="/wishlist" className="text-gray-700 hover:text-indigo-600">Wishlist</Link>}
            {user && <Link to="/purchases" className="text-gray-700 hover:text-indigo-600">Purchases</Link>}
            {user && (
              <Link to="/cart" className="text-gray-700 hover:text-indigo-600 relative">
                Cart
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-2 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center text-[10px]">
                    {cartCount > 9 ? "9+" : cartCount}
                  </span>
                )}
              </Link>
            )}
            {user && (
              <Link to="/about" className="text-gray-700 hover:text-indigo-600">About AI</Link>
            )}
            {user ? (
              <div className="relative">
                <button onClick={() => setShow(!show)} className="text-gray-700 hover:text-indigo-600">
                  {user.name || user.email} {user.role === "ADMIN" && <span className="bg-red-100 text-red-700 text-xs px-1 rounded ml-1">ADMIN</span>}
                </button>
                {show && (
                  <div className="absolute right-0 mt-2 w-48 bg-white shadow-lg rounded-lg p-2">
                    <div className="text-sm text-gray-500 mb-2">{user.customerId || user.email}</div>
                    <div className="text-xs text-gray-400 mb-2">Role: {user.role}</div>
                    <button onClick={() => { logout(); setShow(false); navigate("/"); }} className="text-red-600 text-sm w-full text-left px-2 py-1">Logout</button>
                  </div>
                )}
              </div>
            ) : location.pathname !== "/login" && (
              <Link to="/login" className="bg-indigo-600 text-white px-4 py-2 rounded-lg">Login</Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
