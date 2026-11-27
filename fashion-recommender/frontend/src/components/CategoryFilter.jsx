const categories = ["All", "Women", "Men", "Kids", "Accessories", "Shoes"];

export default function CategoryFilter({ selected, onSelect }) {
  return (
    <div className="flex space-x-2 overflow-x-auto pb-2">
      {categories.map((c) => (
        <button
          key={c}
          onClick={() => onSelect(c)}
          className={`px-4 py-2 rounded-full text-sm whitespace-nowrap ${selected === c ? "bg-indigo-600 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}
        >
          {c}
        </button>
      ))}
    </div>
  );
}