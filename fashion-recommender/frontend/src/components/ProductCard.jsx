import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useState } from "react";
import { addToCart } from "../services/api";

function getProductName(p) {
  return p.productName || p.product_name || p.product_code || p.productCode || "Product";
}
function getProductType(p) {
  return p.productType || p.product_type || p.product_type_name || "";
}
function getColour(p) {
  return p.colourGroup || p.colour || p.colour_group_name || "";
}
function getImage(p) {
  return p.imageUrl || p.image_url || "/placeholder.jpg";
}
function getArticleId(p) {
  return p.articleId || p.article_id || p._id || "";
}

export default function ProductCard({ product }) {
  const { user } = useAuth();
  const [wishlisted, setWishlisted] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [addingToCart, setAddingToCart] = useState(false);

  if (!product) return null;

  const articleId = getArticleId(product);

  const handleWishlist = async () => {
    if (!user) return;
    try {
      if (wishlisted) {
        const { removeWishlistItem } = await import("../services/api");
        await removeWishlistItem(user.id, articleId);
      } else {
        const { addWishlistItem } = await import("../services/api");
        await addWishlistItem({
          userId: user.id,
          articleId,
          productName: getProductName(product),
          productType: getProductType(product),
          colourGroup: getColour(product),
          imageUrl: getImage(product),
        });
      }
      setWishlisted(!wishlisted);
    } catch (e) { /* ignore */ }
  };

  const handlePurchase = async () => {
    if (!user) return;
    setPurchasing(true);
    try {
      const { createPurchase } = await import("../services/api");
      await createPurchase({
        userId: user.id,
        articleId,
        productName: getProductName(product),
        productType: getProductType(product),
        department: product.department || "",
        section: product.section || "",
        colourGroup: getColour(product),
        productGroup: product.productGroup || "",
        imageUrl: getImage(product),
      });
      setPurchasing(true);
    } catch (e) { /* ignore */ }
    setPurchasing(false);
  };

  const handleAddToCart = async () => {
    if (!user) return;
    setAddingToCart(true);
    try {
      await addToCart({ articleId, quantity: 1 });
    } catch (e) { /* ignore */ }
    setAddingToCart(false);
  };

  return (
    <div className="relative">
      <Link to={`/product/${articleId}`}>
        <div className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow relative">
          {product.isNew && (
            <div className="absolute top-2 left-2 bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded z-10">NEW</div>
          )}
          <div className="aspect-square bg-gray-200 overflow-hidden">
            <img
              src={getImage(product)}
              alt={getProductName(product)}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
              onError={(e) => { e.target.src = "/placeholder.jpg"; }}
            />
          </div>
          <div className="p-3">
            <h3 className="font-medium text-gray-900 truncate">{getProductName(product)}</h3>
            <p className="text-sm text-gray-500">{getProductType(product)}</p>
            <p className="text-sm text-gray-400">{getColour(product)}</p>
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleAddToCart(); }}
              disabled={addingToCart}
              className="mt-2 w-full bg-indigo-600 text-white text-xs py-1.5 rounded hover:bg-indigo-700 disabled:opacity-50"
            >
              {addingToCart ? "Adding..." : "Add to Cart"}
            </button>
          </div>
        </div>
      </Link>
    </div>
  );
}
