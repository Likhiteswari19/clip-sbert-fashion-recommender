import os
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import pickle
import logging
import scipy.sparse as sp
from PIL import Image
import io

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
MODEL_DIR = os.path.join(BASE_DIR, "capstone_data", "model")
DATA_DIR = os.path.join(BASE_DIR, "capstone_data")
SPLITS_DIR = os.path.join(DATA_DIR, "splits")

app = FastAPI(title="Fashion Recommendation AI Service", version="1.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

K = 10
ALPHA = 0.7
BETA = 0.3
BATCH_SIZE = 256

user_factors = None
item_factors = None
item_factors_norm = None
user_profiles = None
item_embeddings = None
item_embeddings_norm = None
product_ids = None
product_to_idx = {}
idx_to_product = {}
user_to_index = None
product_to_index = None
train_user_items = None
products_df = None

clip_model = None
clip_processor = None
sbert_model = None


def load_products():
    global products_df
    df = pd.read_csv(os.path.join(DATA_DIR, "products.csv"))
    df["article_id"] = df["article_id"].astype(str).str.zfill(10)
    df = df.set_index("article_id")
    products_df = df
    logger.info(f"Loaded {len(df)} products")


def load_model():
    global user_factors, item_factors, item_factors_norm, user_profiles
    global item_embeddings, item_embeddings_norm, product_ids, product_to_idx, idx_to_product, user_to_index, product_to_index

    u_to_idx_path = os.path.join(MODEL_DIR, "user_to_index.pkl")
    p_to_idx_path = os.path.join(MODEL_DIR, "product_to_index.pkl")
    with open(u_to_idx_path, "rb") as f:
        user_to_index = pickle.load(f)
    with open(p_to_idx_path, "rb") as f:
        product_to_index = pickle.load(f)

    user_factors = np.load(os.path.join(MODEL_DIR, "user_factors.npy")).astype(np.float32)
    item_factors = np.load(os.path.join(MODEL_DIR, "item_factors.npy")).astype(np.float32)
    user_profiles = np.load(os.path.join(MODEL_DIR, "user_multimodal_profiles.npy")).astype(np.float32)
    item_embeddings = np.load(os.path.join(MODEL_DIR, "hybrid_item_embeddings.npy")).astype(np.float32)

    product_ids = np.load(os.path.join(MODEL_DIR, "model_product_ids.npy"), allow_pickle=True)

    item_factor_norms = np.linalg.norm(item_factors, axis=1, keepdims=True)
    item_factors_norm = (item_factors / (item_factor_norms + 1e-8)).astype(np.float32)

    item_embedding_norms = np.linalg.norm(item_embeddings, axis=1, keepdims=True)
    item_embeddings_norm = (item_embeddings / (item_embedding_norms + 1e-8)).astype(np.float32)

    for i, pid in enumerate(product_ids):
        pid_str = str(pid).zfill(10)
        product_to_idx[pid_str] = i
        idx_to_product[i] = pid_str

    logger.info(f"Model loaded. Users: {len(user_factors)}, Products: {len(product_ids)}")


def load_train_matrix():
    global train_user_items
    df = pd.read_csv(os.path.join(SPLITS_DIR, "train.csv"), usecols=["customer_id", "article_id"])
    df["customer_id"] = df["customer_id"].astype(str)
    df["article_id"] = df["article_id"].astype(str).str.zfill(10)
    df["u"] = df["customer_id"].map(user_to_index)
    df["i"] = df["article_id"].map(product_to_index)
    df = df.dropna(subset=["u", "i"])
    df["u"] = df["u"].astype(np.int32)
    df["i"] = df["i"].astype(np.int32)
    df = df.drop_duplicates(["u", "i"])

    rows = df["u"].to_numpy()
    cols = df["i"].to_numpy()
    data = np.ones(len(df), dtype=np.float32)
    train_user_items = sp.csr_matrix(
        (data, (rows, cols)),
        shape=(len(user_factors), len(product_ids))
    )
    logger.info(f"Train matrix: {train_user_items.shape}, interactions: {train_user_items.nnz}")


def load_clip_model():
    global clip_model, clip_processor
    if clip_model is None:
        import torch
        from transformers import CLIPModel, CLIPProcessor
        logger.info("Loading CLIP model...")
        clip_model = CLIPModel.from_pretrained("openai/clip-vit-base-patch32")
        clip_processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")
        clip_model.eval()
        logger.info("CLIP model loaded")


def load_sbert_model():
    global sbert_model
    if sbert_model is None:
        from sentence_transformers import SentenceTransformer
        logger.info("Loading SBERT model...")
        sbert_model = SentenceTransformer("all-MiniLM-L6-v2")
        logger.info("SBERT model loaded")


@app.on_event("startup")
async def startup():
    load_products()
    load_model()
    load_train_matrix()
    logger.info("AI Service fully loaded")


def get_top_k(scores, top_k, exclude_indices=None):
    if exclude_indices is not None and len(exclude_indices) > 0:
        scores = scores.copy()
        scores[exclude_indices] = -np.inf
    if len(scores) > top_k:
        top = np.argpartition(scores, -top_k)[-top_k:]
        top = top[np.argsort(scores[top])[::-1]]
    else:
        top = np.argsort(scores)[::-1][:top_k]
    return top


def build_product_response(pid, score=None, rank=None):
    if pid not in products_df.index:
        return None
    p = products_df.loc[pid]
    resp = {
        "article_id": pid,
        "product_code": str(p.get("product_code", "")),
        "product_name": p.get("prod_name", ""),
        "product_type": p.get("product_type_name", ""),
        "product_group": p.get("product_group_name", ""),
        "department": p.get("department_name", ""),
        "category": p.get("section_name", ""),
        "colour": p.get("colour_group_name", ""),
        "image_url": f"/images/{pid}.jpg",
    }
    if score is not None:
        resp["score"] = float(score)
    if rank is not None:
        resp["rank"] = rank
    return resp


class RecommendationRequest(BaseModel):
    customer_id: str
    top_k: Optional[int] = K


class SimilarRequest(BaseModel):
    article_id: str
    top_k: Optional[int] = K


class GenerateEmbeddingsRequest(BaseModel):
    product_name: str
    department: str = ""
    section: str = ""
    colour: str = ""
    product_group: str = ""
    description: str = ""
    image: Optional[str] = None


@app.get("/health")
async def health():
    return {"status": "ok", "users": len(user_factors) if user_factors is not None else 0}


@app.post("/api/recommendations")
async def get_recommendations(req: RecommendationRequest):
    if user_factors is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    cid = req.customer_id.strip()
    top_k = req.top_k
    if cid not in user_to_index:
        return {"customer_id": cid, "recommendations": [], "message": "User not found in model"}
    u_idx = user_to_index[cid]
    svd_scores = user_factors[u_idx] @ item_factors_norm.T
    content_scores = user_profiles[u_idx] @ item_embeddings_norm.T
    svd_scores = (svd_scores - svd_scores.min()) / (svd_scores.max() - svd_scores.min() + 1e-8)
    content_scores = (content_scores - content_scores.min()) / (content_scores.max() - content_scores.min() + 1e-8)
    hybrid_scores = ALPHA * svd_scores + BETA * content_scores
    seen = train_user_items.getrow(u_idx).indices
    top = get_top_k(hybrid_scores, top_k, seen)
    recommendations = [build_product_response(idx_to_product[int(i)], float(hybrid_scores[i])) for i in top]
    recommendations = [r for r in recommendations if r is not None]
    return {"customer_id": cid, "recommendations": recommendations, "count": len(recommendations)}


@app.post("/api/similar")
async def get_similar(req: SimilarRequest):
    if item_embeddings is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    aid = req.article_id.strip().zfill(10)
    top_k = req.top_k
    if aid not in product_to_idx:
        raise HTTPException(status_code=404, detail=f"Product {aid} not found in model")
    idx = product_to_idx[aid]
    scores = item_embeddings_norm @ item_embeddings_norm[idx]
    seen = train_user_items.getcol(idx).indices
    top = get_top_k(scores, top_k, seen)
    recommendations = []
    for rank, i in enumerate(top, 1):
        pid = idx_to_product.get(int(i))
        r = build_product_response(pid, float(scores[i]), rank)
        if r is not None:
            recommendations.append(r)
    return {"product_id": aid, "similar_products": recommendations, "count": len(recommendations)}


@app.get("/api/product/{article_id}")
async def get_product(article_id: str):
    aid = article_id.strip().zfill(10)
    if aid not in products_df.index:
        raise HTTPException(status_code=404, detail="Product not found")
    p = products_df.loc[aid]
    return {
        "article_id": aid,
        "product_code": str(p.get("product_code", "")),
        "product_name": p.get("prod_name", ""),
        "product_type": p.get("product_type_name", ""),
        "product_group": p.get("product_group_name", ""),
        "graphical_appearance": p.get("graphical_appearance_name", ""),
        "colour_group": p.get("colour_group_name", ""),
        "perceived_colour_value": p.get("perceived_colour_value_name", ""),
        "perceived_colour_master": p.get("perceived_colour_master_name", ""),
        "department": p.get("department_name", ""),
        "index": p.get("index_name", ""),
        "index_group": p.get("index_group_name", ""),
        "section": p.get("section_name", ""),
        "garment_group": p.get("garment_group_name", ""),
        "detail_desc": p.get("detail_desc", ""),
        "customer_count": int(p.get("customer_count", 0)),
        "image_url": f"/images/{aid}.jpg",
    }


@app.post("/api/generate-embeddings")
async def generate_embeddings(req: GenerateEmbeddingsRequest):
    try:
        load_clip_model()
        load_sbert_model()

        clip_embedding = None
        sbert_embedding = None

        if req.image:
            import base64
            img_data = base64.b64decode(req.image)
            image = Image.open(io.BytesIO(img_data)).convert("RGB")
            inputs = clip_processor(images=image, return_tensors="pt")
            with __import__("torch").no_grad():
                clip_out = clip_model.get_image_features(**inputs)
            clip_embedding = clip_out.squeeze(0).numpy().astype(np.float32)
            clip_embedding = clip_embedding / (np.linalg.norm(clip_embedding) + 1e-8)
            logger.info(f"CLIP embedding generated: shape={clip_embedding.shape}")

        if req.product_name or req.description:
            text = f"{req.product_name} {req.department} {req.section} {req.colour} {req.product_group} {req.description}"
            sbert_embedding = sbert_model.encode(text, normalize_embeddings=True).astype(np.float32)
            logger.info(f"SBERT embedding generated: shape={sbert_embedding.shape}")

        return {
            "clipEmbedding": clip_embedding.tolist() if clip_embedding is not None else None,
            "sbertEmbedding": sbert_embedding.tolist() if sbert_embedding is not None else None,
            "clipDim": len(clip_embedding) if clip_embedding is not None else None,
            "sbertDim": len(sbert_embedding) if sbert_embedding is not None else None,
        }
    except Exception as e:
        logger.error(f"Embedding generation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
