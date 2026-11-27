import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import ProductList from "./pages/ProductList";
import ProductDetail from "./pages/ProductDetail";
import Recommendations from "./pages/Recommendations";
import Login from "./pages/Login";
import AboutAI from "./pages/AboutAI";
import ForYou from "./pages/ForYou";
import Admin from "./pages/Admin";
import Wishlist from "./pages/Wishlist";
import PurchaseHistory from "./pages/PurchaseHistory";
import Cart from "./pages/Cart";

function AppRoutes() {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-pulse bg-gray-200 rounded h-12 w-32" /></div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main>
        <Routes>
          <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
          <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
          <Route path="/products" element={<ProtectedRoute><ProductList /></ProtectedRoute>} />
          <Route path="/product/:articleId" element={<ProtectedRoute><ProductDetail /></ProtectedRoute>} />
          <Route path="/recommendations" element={<ProtectedRoute><Recommendations /></ProtectedRoute>} />
          <Route path="/for-you" element={<ProtectedRoute><ForYou /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
          <Route path="/wishlist" element={<ProtectedRoute><Wishlist /></ProtectedRoute>} />
          <Route path="/cart" element={<ProtectedRoute><Cart /></ProtectedRoute>} />
          <Route path="/purchases" element={<ProtectedRoute><PurchaseHistory /></ProtectedRoute>} />
          <Route path="/search" element={<ProtectedRoute><ProductList /></ProtectedRoute>} />
          <Route path="/about" element={<ProtectedRoute><AboutAI /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <footer className="bg-white border-t mt-16">
        <div className="max-w-7xl mx-auto px-4 py-6 text-center text-gray-400 text-sm">
          FashionAI — AI-Powered Fashion Recommendations using CLIP + SBERT + SVD
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
