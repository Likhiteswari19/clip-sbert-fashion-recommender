import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await register(name, email, password, customerId);
      }
      navigate(location.state?.from || "/", { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || "Authentication failed");
    }
    setLoading(false);
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <h1 className="text-2xl font-bold mb-6 text-center">{isLogin ? "Login" : "Register"}</h1>
      {error && <div className="bg-red-50 text-red-700 p-3 rounded-lg mb-4 text-sm">{error}</div>}
      <form onSubmit={handleSubmit} className="space-y-4">
        {!isLogin && (
          <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Name" required className="w-full px-4 py-3 border rounded-lg" />
        )}
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" required className="w-full px-4 py-3 border rounded-lg" />
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" required className="w-full px-4 py-3 border rounded-lg" />
        {!isLogin && (
          <input type="text" value={customerId} onChange={e => setCustomerId(e.target.value)} placeholder="H&M Customer ID (optional)" className="w-full px-4 py-3 border rounded-lg" />
        )}
        <button type="submit" disabled={loading} className="w-full bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 disabled:opacity-50">
          {loading ? "Loading..." : isLogin ? "Login" : "Register"}
        </button>
      </form>
      <p className="text-center mt-4 text-sm">
        {isLogin ? "Don't have an account? " : "Already have an account? "}
        <button onClick={() => { setIsLogin(!isLogin); setError(""); }} className="text-indigo-600 font-medium">
          {isLogin ? "Register" : "Login"}
        </button>
      </p>
    </div>
  );
}