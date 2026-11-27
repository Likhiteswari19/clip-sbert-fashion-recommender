import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { getProducts } from "../services/api";
import ProductGrid from "../components/ProductGrid";
import SearchBar from "../components/SearchBar";
import Hero from "../components/Hero";
import Loading from "../components/Loading";
import CategoryFilter from "../components/CategoryFilter";

const CATEGORY_MAP = {
  All: ["all"],
  Women: ["womens", "women", "lady"],
  Men: ["mens", "men"],
  Kids: ["kids", "kid", "baby", "girl", "boy"],
  Accessories: ["accessories", "bag", "hat", "scarf", "belt", "watch", "jewelry", "hair"],
  Shoes: ["shoes", "shoe", "boot", "sneaker", "sandal", "heel", "loafer", "pump", "trainer"],
};

export default function Home() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("All");
  const [query, setQuery] = useState("");

  useEffect(() => {
    async function fetch() {
      try {
        const r = await getProducts(1, 12);
        const data = r.data || r;
        const items = data.products || data;
        setProducts(items);
      } catch (e) { console.error(e); }
      setLoading(false);
    }
    fetch();
  }, []);

  const filtered = useMemo(() => {
    const keywords = CATEGORY_MAP[category] || [category.toLowerCase()];
    return products.filter(p => {
      const matchCat = category === "All" || keywords.some(kw => {
        const s = `${p.productType || ""} ${p.productGroup || ""} ${p.section || ""} ${p.department || ""}`;
        return new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\w*`, "i").test(s);
      });
      const matchQ = !query || (p.productName || "").toLowerCase().includes(query.toLowerCase());
      return matchCat && matchQ;
    });
  }, [products, category, query]);

  return (
    <div>
      <Hero />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6"><SearchBar /></div>
        <div className="mb-6"><CategoryFilter selected={category} onSelect={setCategory} /></div>
        <h2 className="text-2xl font-bold mb-4">Featured Products</h2>
        {loading ? <Loading /> : <ProductGrid products={filtered} loading={false} />}
      </div>
    </div>
  );
}