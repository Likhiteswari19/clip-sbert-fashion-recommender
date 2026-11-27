import React, { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";

const AuthContext = createContext();
const API = "http://localhost:3000/api";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("fashion_token") || "");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      axios.get(`${API}/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => {
          const userData = r.data.user || r.data;
          if (userData._id && !userData.id) userData.id = userData._id;
          setUser(userData);
        })
        .catch(() => { localStorage.removeItem("fashion_token"); setToken(""); })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = async (email, password) => {
    const r = await axios.post(`${API}/auth/login`, { email, password });
    localStorage.setItem("fashion_token", r.data.token);
    setToken(r.data.token);
    setUser(r.data.user);
    return r.data;
  };

  const adminLogin = async (email, password) => {
    const r = await axios.post(`${API}/auth/admin/login`, { email, password });
    localStorage.setItem("fashion_token", r.data.token);
    setToken(r.data.token);
    setUser(r.data.user);
    return r.data;
  };

  const register = async (name, email, password, customerId) => {
    const r = await axios.post(`${API}/auth/register`, { name, email, password, customerId });
    localStorage.setItem("fashion_token", r.data.token);
    setToken(r.data.token);
    setUser(r.data.user);
    return r.data;
  };

  const logout = () => {
    localStorage.removeItem("fashion_token");
    setToken("");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, adminLogin, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
