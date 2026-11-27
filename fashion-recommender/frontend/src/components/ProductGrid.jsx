import ProductCard from "./ProductCard";

export default function ProductGrid({ products, loading }) {
  if (loading) {
    return <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{Array(8).fill().map((_, i) => <div key={i} className="bg-gray-200 rounded-xl h-64 animate-pulse" />)}</div>;
  }
  if (!products || products.length === 0) {
    return <div className="text-center py-12 text-gray-500">No products found</div>;
  }
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {products.map((p) => (
        <ProductCard key={p._id || p.articleId || p.article_id} product={p} />
      ))}
    </div>
  );
}