import { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { getProduct, getSimilarProducts, logInteraction, addToCart } from "../services/api";
import ProductCard from "../components/ProductCard";
import Loading from "../components/Loading";
import { useAuth } from "../context/AuthContext";

export default function ProductDetail() {
  const { articleId } = useParams();
  const [product, setProduct] = useState(null);
  const [similar, setSimilar] = useState([]);
  const [loading, setLoading] = useState(true);
  const [similarLoading, setSimilarLoading] = useState(true);
  const [addingToCart, setAddingToCart] = useState(false);
  const { user } = useAuth();

useEffect(() => {
    async function fetch() {
      try {
        const r = await getProduct(articleId);
        setProduct(r.data || r);
      } catch (e) { console.error(e); }
      try {
        const s = await getSimilarProducts(articleId);
        const data = s.data || s;
        setSimilar(data.similar_products || data.similar || []);
      } catch (e) { console.error(e); }
      try { await logInteraction(articleId, "view"); } catch (e) { /* auth not required */ }
      setSimilarLoading(false);
      setLoading(false);
    }
    fetch();
  }, [articleId]);

  if (loading) return <Loading />;
  if (!product) return <div className="text-center py-16 text-gray-500">Product not found</div>;

  const pid = product.articleId || product.article_id;

  const handleAddToCart = async () => {
    if (!user) return;
    setAddingToCart(true);
    try {
      await addToCart({ articleId: pid, quantity: 1 });
    } catch (e) { /* ignore */ }
    setAddingToCart(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="grid md:grid-cols-2 gap-8">
        <div className="bg-gray-200 rounded-xl overflow-hidden aspect-square">
          <img
            src={product.imageUrl || product.image_url || `/images/${pid}.jpg`}
            alt={product.productName || product.product_name || "Product"}
            className="w-full h-full object-cover"
            onError={(e) => { e.target.src = "/placeholder.jpg"; }}
          />
        </div>
        <div>
          <h1 className="text-2xl font-bold mb-2">{product.productName || product.product_name || "Product"}</h1>
          <p className="text-gray-500 mb-4">{product.productType || product.product_type || product.product_type_name || ""}</p>
          {Object.entries({
            "Department": product.department || product.department_name,
            "Section": product.section || product.section_name,
            "Colour": product.colourGroup || product.colour_group_name || product.colour || "",
            "Group": product.productGroup || product.product_group_name || product.productGroup || "",
            "Appearance": product.graphicalAppearance || product.graphical_appearance_name || "",
            "Description": product.detailDesc || product.detail_desc || product.detailDesc || "",
          }).filter(([_, v]) => v).map(([k, v]) => (
            <div key={k} className="flex py-1"><span className="font-medium w-28">{k}:</span><span className="text-gray-600">{v}</span></div>
          ))}
          <div className="flex gap-2 mt-6">
            <button
              onClick={handleAddToCart}
              disabled={addingToCart}
              className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              {addingToCart ? "Adding..." : "Add to Cart"}
            </button>
          </div>
        </div>
      </div>
      <div className="mt-12">
        <h2 className="text-xl font-bold mb-4">Similar Products</h2>
        {similarLoading ? <Loading /> : (
          similar.length > 0 ? <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{similar.map(p => <ProductCard key={p.article_id || p.articleId || p._id} product={p} />)}</div> : <p className="text-gray-500">No similar products found</p>
        )}
      </div>
    </div>
  );
}