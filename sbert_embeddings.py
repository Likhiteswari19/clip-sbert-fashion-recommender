import os
import numpy as np
import pandas as pd
from tqdm import tqdm
from sentence_transformers import SentenceTransformer

# ============================================================
# SETTINGS
# ============================================================

PRODUCTS_FILE = "capstone_data/products.csv"

OUTPUT_FILE = "capstone_data/sbert_embeddings.npy"
ID_FILE = "capstone_data/sbert_article_ids.npy"

MODEL_NAME = "all-MiniLM-L6-v2"

BATCH_SIZE = 32

# ============================================================
# LOAD PRODUCTS
# ============================================================

print("Loading products...")

products = pd.read_csv(
    PRODUCTS_FILE,
    dtype={"article_id": str}
)

products["article_id"] = (
    products["article_id"]
    .str.replace(".0", "", regex=False)
    .str.zfill(10)
)

print("Products loaded:", len(products))

# ============================================================
# CHECK PRODUCT TEXT
# ============================================================

if "product_text" not in products.columns:
    raise ValueError(
        "product_text column not found in products.csv"
    )

texts = (
    products["product_text"]
    .fillna("")
    .astype(str)
    .tolist()
)

article_ids = (
    products["article_id"]
    .tolist()
)

# ============================================================
# LOAD SBERT
# ============================================================

print("\nLoading SBERT model...")

model = SentenceTransformer(MODEL_NAME)

print("SBERT loaded successfully.")

# ============================================================
# CREATE EMBEDDINGS
# ============================================================

print("\nGenerating text embeddings...")

embeddings = model.encode(
    texts,
    batch_size=BATCH_SIZE,
    show_progress_bar=True,
    normalize_embeddings=True
)

embeddings = np.asarray(
    embeddings,
    dtype=np.float32
)

article_ids = np.array(
    article_ids
)

# ============================================================
# SAVE
# ============================================================

np.save(
    OUTPUT_FILE,
    embeddings
)

np.save(
    ID_FILE,
    article_ids
)

# ============================================================
# FINAL RESULT
# ============================================================

print("\n========================================")
print("SBERT PROCESSING COMPLETE")
print("========================================")

print("Products processed:", len(article_ids))
print("Embedding shape:", embeddings.shape)

print("\nFiles created:")

print(" ", OUTPUT_FILE)
print(" ", ID_FILE)
