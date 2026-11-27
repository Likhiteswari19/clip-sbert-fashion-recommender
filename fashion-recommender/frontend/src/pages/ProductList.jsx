import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { searchProducts, getProducts } from "../services/api";
import ProductGrid from "../components/ProductGrid";
import SearchBar from "../components/SearchBar";
import Loading from "../components/Loading";

const ALL_DEPARTMENTS = ["All", "Menswear", "Womenswear", "Kids", "Home", "Beauty", "Sports", "Accessories"];
const ALL_COLOURS = ["All", "Black", "White", "Blue", "Red", "Green", "Beige", "Grey", "Navy", "Brown"];

export default function ProductList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [deptFilter, setDeptFilter] = useState("All");
  const [colourFilter, setColourFilter] = useState("All");
  const [showNewFirst, setShowNewFirst] = useState(false);

  useEffect(() => {
    async function fetch() {
      setLoading(true);
      try {
        if (query.trim()) {
          const r = await searchProducts(query, page);
          const data = r.data || r;
          setProducts(data.products || []);
          setTotal(data.total || 0);
        } else {
          const r = await getProducts(page, 40);
          const data = r.data || r;
          setProducts(data.products || []);
          setTotal(data.total || 0);
        }
      } catch (e) { console.error(e); }
      setLoading(false);
    }
    fetch();
  }, [query, page]);

  const filtered = useMemo(() => {
    let result = products;
    if (deptFilter !== "All") {
      result = result.filter(p => {
        const s = `${p.department || ""} ${p.productType || ""} ${p.productGroup || ""} ${p.section || ""}`.toLowerCase();
        return s.includes(deptFilter.toLowerCase());
      });
    }
    if (colourFilter !== "All") {
      result = result.filter(p => {
        const c = `${p.colourGroup || ""} ${p.perceivedColourValue || ""}`.toLowerCase();
        return c.includes(colourFilter.toLowerCase());
      });
    }
    if (showNewFirst) {
      const newProducts = result.filter(p => p.isNew);
      const oldProducts = result.filter(p => !p.isNew);
      result = [...newProducts, ...oldProducts];
    }
    return result;
  }, [products, deptFilter, colourFilter, showNewFirst]);

  const totalPages = Math.ceil(filtered.length / 20);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">Products</h1>
      <div className="mb-4"><SearchBar onSearch={setQuery} /></div>
      <div className="flex flex-wrap gap-2 mb-4 items-center">
        <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)} className="px-3 py-2 border rounded text-sm">
          {ALL_DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <select value={colourFilter} onChange={e => setColourFilter(e.target.value)} className="px-3 py-2 border rounded text-sm">
          {ALL_COLOURS.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input type="checkbox" checked={showNewFirst} onChange={e => setShowNewFirst(e.target.checked)} />
          New products first
        </label>
      </div>
      <p className="text-gray-500 mb-4">{filtered.length} products found</p>
      {loading ? <Loading /> : <ProductGrid products={filtered} loading={false} />}
      {totalPages > 1 && (
        <div className="flex justify-center mt-8 space-x-2">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50">Previous</button>
          <span className="px-4 py-2">Page {page} of {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50">Next</button>
        </div>
      )}
    </div>
  );
}
