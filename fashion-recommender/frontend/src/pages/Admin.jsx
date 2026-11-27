import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { getUsers, getNewProducts, getProduct, createPurchase, addWishlistItem, updateUserRole } from "../services/api";
import ProductCard from "../components/ProductCard";
import Loading from "../components/Loading";

export default function AdminPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [newProducts, setNewProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [buyUserId, setBuyUserId] = useState("");

  useEffect(() => {
    if (user && user.role === "ADMIN") loadAdminData();
  }, [user]);

  async function loadAdminData() {
    try {
      const [u, np] = await Promise.all([getUsers(), getNewProducts()]);
      setUsers(u.data.users || []);
      setNewProducts(np.data.products || []);
    } catch (e) { /* ignore */ }
    setLoading(false);
  }

  if (!user || user.role !== "ADMIN") {
    return <div className="text-center py-16 text-gray-500">Admin access required</div>;
  }

  const handleAddProduct = async (e) => {
    e.preventDefault();
    const form = new FormData(e.target);
    const imageFile = form.get("image");
    let imageUrl = "";
    if (imageFile && imageFile.size > 0) {
      imageUrl = URL.createObjectURL(imageFile);
    }
    try {
      const { addProduct } = await import("../services/api");
      await addProduct({
        productName: form.get("productName"),
        productType: form.get("productType"),
        productGroup: form.get("productGroup"),
        department: form.get("department"),
        section: form.get("section"),
        colourGroup: form.get("colourGroup"),
        detailDesc: form.get("detailDesc"),
        imageUrl: imageUrl || `/placeholder.jpg`,
        productText: `${form.get("productName")} ${form.get("department")} ${form.get("section")} ${form.get("colourGroup")}`,
      });
      setShowAddForm(false);
      loadAdminData();
    } catch (err) {
      alert("Failed to add product: " + err.message);
    }
  };

  const handleBuyAsUser = async () => {
    if (!selectedProduct || !buyUserId) return;
    try {
      const u = users.find(u => u._id === buyUserId);
      if (!u) return alert("User not found");
      await createPurchase({
        userId: u._id,
        articleId: selectedProduct.articleId,
        productName: selectedProduct.productName,
        productType: selectedProduct.productType,
        department: selectedProduct.department,
        section: selectedProduct.section,
        colourGroup: selectedProduct.colourGroup,
        productGroup: selectedProduct.productGroup,
        imageUrl: selectedProduct.imageUrl,
      });
      setShowBuyModal(false);
      alert("Purchase created for " + u.name);
    } catch (err) {
      alert("Failed: " + err.message);
    }
  };

  if (loading) return <Loading />;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <button onClick={() => setShowAddForm(!showAddForm)} className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700">
          {showAddForm ? "Cancel" : "+ Add Product"}
        </button>
      </div>

      {showAddForm && (
        <div className="bg-white border rounded-xl p-6 mb-8 animate-fade-in">
          <h2 className="text-xl font-bold mb-4">Add New Product</h2>
          <form onSubmit={handleAddProduct} className="grid grid-cols-2 gap-4">
            <input name="productName" placeholder="Product Name" required className="px-3 py-2 border rounded" />
            <input name="productType" placeholder="Product Type" className="px-3 py-2 border rounded" />
            <input name="productGroup" placeholder="Product Group" className="px-3 py-2 border rounded" />
            <input name="department" placeholder="Department" className="px-3 py-2 border rounded" />
            <input name="section" placeholder="Section" className="px-3 py-2 border rounded" />
            <input name="colourGroup" placeholder="Colour" className="px-3 py-2 border rounded" />
            <textarea name="detailDesc" placeholder="Description" rows={2} className="col-span-2 px-3 py-2 border rounded" />
            <input name="image" type="file" accept="image/*" className="col-span-2" />
            <button type="submit" className="col-span-2 bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700">Add Product</button>
          </form>
        </div>
      )}

      <h2 className="text-xl font-bold mb-4">Users ({users.length})</h2>
      <div className="overflow-x-auto mb-8">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="border p-2 text-left">Name</th>
              <th className="border p-2 text-left">Email</th>
              <th className="border p-2 text-left">Role</th>
              <th className="border p-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u._id} className="hover:bg-gray-50">
                <td className="border p-2">{u.name}</td>
                <td className="border p-2">{u.email}</td>
                <td className="border p-2">
                  <span className={`px-2 py-0.5 rounded text-xs ${u.role === "ADMIN" ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600"}`}>{u.role}</span>
                </td>
                <td className="border p-2">
                  {u.role !== "ADMIN" && (
                    <button
                      onClick={async () => { await updateUserRole(u._id, "ADMIN"); loadAdminData(); }}
                      className="text-xs bg-red-50 text-red-600 px-2 py-1 rounded hover:bg-red-100"
                    >
                      Make Admin
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="text-xl font-bold mb-4">New Products ({newProducts.length})</h2>
      {newProducts.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {newProducts.map(p => (
            <div key={p._id} className="relative">
              <ProductCard product={p} />
              <div className="flex gap-1 p-2 pt-0">
                <button onClick={() => { setSelectedProduct(p); setShowBuyModal(true); }} className="flex-1 text-xs bg-indigo-50 text-indigo-700 py-1 rounded">Buy as User</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showBuyModal && selectedProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-bold mb-4">Buy as User</h3>
            <p className="text-sm text-gray-500 mb-2">Product: {selectedProduct.productName}</p>
            <select value={buyUserId} onChange={e => setBuyUserId(e.target.value)} className="w-full px-3 py-2 border rounded mb-4">
              <option value="">Select user...</option>
              {users.filter(u => u.role === "USER").map(u => (
                <option key={u._id} value={u._id}>{u.name} ({u.email})</option>
              ))}
            </select>
            <div className="flex gap-2">
              <button onClick={handleBuyAsUser} className="flex-1 bg-green-600 text-white py-2 rounded-lg">Confirm Purchase</button>
              <button onClick={() => setShowBuyModal(false)} className="flex-1 bg-gray-200 py-2 rounded-lg">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
