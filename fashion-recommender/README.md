# Fashion Recommendation System

## Quick Start

### Prerequisites
- Node.js 18+
- Python 3.10+
- MongoDB running locally (default: localhost:27017)
- Python packages: see `ai_service/requirements.txt`

### Setup

```powershell
# 1. Navigate to project
cd C:\Users\91967\Desktop\Cap\fashion-recommender

# 2. Install backend dependencies
cd backend
npm install
cd ..

# 3. Install frontend dependencies
cd frontend
npm install
cd ..

# 4. Install AI service dependencies
cd ai_service
pip install -r requirements.txt
cd ..
```

### Run All Services

Open **three** terminal windows:

**Terminal 1 - AI Service (FastAPI):**
```powershell
cd C:\Users\91967\Desktop\Cap\fashion-recommender\ai_service
python main.py
```
Runs on http://localhost:8000. Loads all model artifacts on startup (~1 minute).

**Terminal 2 - Backend (Node.js):**
```powershell
cd C:\Users\91967\Desktop\Cap\fashion-recommender\backend
npm start
```
Runs on http://localhost:3000. Connects to MongoDB.

**Terminal 3 - Frontend (React):**
```powershell
cd C:\Users\91967\Desktop\Cap\fashion-recommender\frontend
npm run dev
```
Runs on http://localhost:5173.

### MongoDB Setup

If MongoDB is not running:
```powershell
# Start MongoDB (default install)
net start MongoDB
```

Or use MongoDB Atlas for cloud-based MongoDB.

### capstone_data Location

The `capstone_data` folder must be placed **directly above** `fashion-recommender`:

```
C:\Users\91967\Desktop\Cap\
├── capstone_data\       ← Required: dataset + model files
│   ├── products.csv
│   ├── images\
│   ├── model\
│   └── splits\
└── fashion-recommender\  ← This project
    ├── frontend\
    ├── backend\
    └── ai_service\
```

The backend and AI service reference `../capstone_data/` from their directories.

## API Reference

### Backend API (http://localhost:3000)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | /api/products?page=N&limit=N | List products (paginated) | No |
| GET | /api/products/:articleId | Product details | No |
| GET | /api/search?q=query | Search products | No |
| POST | /api/auth/register | Register | No |
| POST | /api/auth/login | Login | No |
| GET | /api/auth/me | Current user | Yes |
| GET | /api/recommendations/:customerId | Top-10 recommendations | Yes |
| GET | /api/recommendations/:articleId/similar | Similar products | Yes |
| POST | /api/interactions | Log interaction | Yes |
| GET | /api/interactions | Get interactions | Yes |

### AI Service API (http://localhost:8000)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /health | Health check |
| POST | /api/recommendations | Get recommendations (customer_id, top_k) |
| POST | /api/similar | Similar products (article_id, top_k) |
| GET | /api/product/:articleId | Product details |

### Sample API Requests

```powershell
# List products
curl http://localhost:3000/api/products?page=1&limit=10

# Search
curl "http://localhost:3000/api/search?q=shirt"

# Product details
curl http://localhost:3000/api/products/0176209023

# Login
curl -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d '{"email":"test@test.com","password":"pass123"}'

# Get recommendations (requires JWT token)
curl http://localhost:3000/api/recommendations/9903a25eda62787e7f5801493a680085ae4d7a0bf3caa5639419493e81962be6 -H "Authorization: Bearer YOUR_TOKEN"

# Similar products
curl http://localhost:3000/api/recommendations/0176209023/similar -H "Authorization: Bearer YOUR_TOKEN"
```

## Project Structure

```
fashion-recommender/
├── frontend/           React + Vite + Tailwind
│   ├── src/pages/      Home, ProductList, ProductDetail, Recommendations, Login, AboutAI
│   ├── src/components/ Navbar, ProductCard, ProductGrid, SearchBar, Hero, Loading
│   └── src/context/    AuthContext
├── backend/            Node.js + Express + MongoDB
│   ├── controllers/    auth, products, recommendations, search, interactions
│   ├── routes/         API routing
│   ├── models/         Mongoose schemas
│   ├── services/       recommendation, product services
│   └── middleware/     JWT auth
├── ai_service/         FastAPI inference service
│   └── main.py         Loads model artifacts once, serves recommendations
├── capstone_data/      H&M dataset + trained model files
└── README.md
```

## How the Model is Used

1. **AI Service** loads model artifacts on startup:
   - `user_factors.npy`, `item_factors.npy` → SVD collaborative scores
   - `user_multimodal_profiles.npy`, `hybrid_item_embeddings.npy` → CLIP+SBERT content scores
   - `model_product_ids.npy`, `user_to_index.pkl`, `product_to_index.pkl` → ID mappings

2. **Personalized recommendations**: Given a customer ID → find user index → compute `0.7 × SVD score + 0.3 × content similarity` → exclude training items → return Top-10

3. **Similar products**: Given an article ID → find embedding → compute cosine similarity against all items → return top matches

4. **No retraining**: Models are loaded once at startup and never modified.
