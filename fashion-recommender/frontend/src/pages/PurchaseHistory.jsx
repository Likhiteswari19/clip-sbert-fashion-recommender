import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getUserPurchases } from "../services/api";
import Loading from "../components/Loading";

export default function PurchaseHistory() {
  const { user } = useAuth();
  const userId = user?.id || user?._id;
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && userId) loadPurchases();
  }, [user, userId]);

  async function loadPurchases() {
    try {
      const r = await getUserPurchases(userId);
      setPurchases(r.data.purchases || []);
    } catch (e) { /* ignore */ }
    setLoading(false);
  }

  if (!user) return <div className="text-center py-16 text-gray-500">Please login to view purchase history</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">Purchase History</h1>
      {loading ? <Loading /> : purchases.length === 0 ? (
        <div className="text-center py-16 text-gray-500">No purchases yet</div>
      ) : (
        <>
          <p className="text-gray-500 mb-4">{purchases.length} purchases</p>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border p-2 text-left">Image</th>
                  <th className="border p-2 text-left">Name</th>
                  <th className="border p-2 text-left">Type</th>
                  <th className="border p-2 text-left">Department</th>
                  <th className="border p-2 text-left">Colour</th>
                  <th className="border p-2 text-left">Date</th>
                </tr>
              </thead>
              <tbody>
                {purchases.map(p => (
                  <tr key={p._id} className="hover:bg-gray-50">
                    <td className="border p-2">
                      <img src={p.imageUrl || "/placeholder.jpg"} alt={p.productName} className="w-12 h-12 object-cover rounded" onError={(e) => { e.target.src = "/placeholder.jpg"; }} />
                    </td>
                    <td className="border p-2">{p.productName}</td>
                    <td className="border p-2">{p.productType}</td>
                    <td className="border p-2">{p.department}</td>
                    <td className="border p-2">{p.colourGroup}</td>
                    <td className="border p-2">{new Date(p.purchaseDate).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
