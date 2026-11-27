import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { searchProducts } from "../services/api";

export default function SearchBar({ onSearch }) {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) {
      if (onSearch) onSearch(query.trim());
      navigate(`/search?q=${encodeURIComponent(query)}`);
    }
  };
  return (
    <form onSubmit={handleSubmit} className="flex-1 max-w-lg mx-auto">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search products..."
          className="w-full px-4 py-2 pl-10 bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <span className="absolute left-3 top-2.5 text-gray-400">&#128269;</span>
      </div>
    </form>
  );
}