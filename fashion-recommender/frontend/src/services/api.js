import axios from "axios";

const API = "http://localhost:3000/api";

const api = axios.create({ baseURL: API, timeout: 15000 });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("fashion_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const getProducts = (page = 1, limit = 20) => api.get(`/products?page=${page}&limit=${limit}`);
export const getProduct = (articleId) => api.get(`/products/${articleId}`);
export const searchProducts = (q, page = 1) => api.get(`/search?q=${encodeURIComponent(q)}&page=${page}`);
export const getRecommendations = (customerId) => api.get(`/recommendations/${customerId}`);
export const getSimilarProducts = (articleId) => api.get(`/recommendations/${articleId}/similar`);
export const logInteraction = (articleId, type = "view") => api.post(`/interactions`, { articleId, type });
export const login = (email, password) => api.post(`/auth/login`, { email, password });
export const register = (name, email, password, customerId) => api.post(`/auth/register`, { name, email, password, customerId });
export const getMe = () => api.get(`/auth/me`);

export const adminLogin = (email, password) => api.post(`/auth/admin/login`, { email, password });
export const getUsers = () => api.get(`/auth/users`);
export const updateUserRole = (id, role) => api.put(`/auth/users/${id}/role`, { role });
export const deleteUser = (id) => api.delete(`/auth/users/${id}`);

export const getNewProducts = () => api.get(`/products/new`);
export const addProduct = (data) => api.post(`/products`, data);
export const updateProduct = (articleId, data) => api.put(`/products/${articleId}`, data);
export const deleteProduct = (articleId) => api.delete(`/products/${articleId}`);

export const getForYou = (userId) => api.get(`/recommendations/for-you/${userId}`);
export const getProductEmbeddings = (articleId) => api.get(`/products/embeddings/${articleId}`);

export const getPurchases = (userId) => api.get(`/purchases${userId ? `?userId=${userId}` : ""}`);
export const createPurchase = (data) => api.post(`/purchases`, data);
export const getUserPurchases = (userId) => api.get(`/purchases/${userId}`);

export const getWishlist = (userId) => api.get(`/wishlist/${userId}`);
export const addWishlistItem = (data) => api.post(`/wishlist`, data);
export const removeWishlistItem = (userId, articleId) => api.delete(`/wishlist/${userId}/${articleId}`);

export const getCart = () => api.get(`/cart`);
export const addToCart = (data) => api.post(`/cart`, data);
export const removeFromCart = (articleId) => api.delete(`/cart/${articleId}`);
export const updateCartItem = (articleId, quantity) => api.put(`/cart/${articleId}`, { quantity });
export const checkout = () => api.post(`/cart/checkout`);

export const generateEmbeddings = (data) => api.post(`http://localhost:8000/api/generate-embeddings`, data, { timeout: 60000 });

export default api;
