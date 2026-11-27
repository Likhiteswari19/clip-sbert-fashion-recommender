import os
import pickle
import numpy as np
import pandas as pd
from scipy.sparse import csr_matrix
from tqdm import tqdm

BASE = "capstone_data"
MODEL = os.path.join(BASE, "model")
SPLITS = os.path.join(BASE, "splits")

print("Loading model files...")

user_factors = np.load(os.path.join(MODEL, "user_factors.npy"))
item_factors = np.load(os.path.join(MODEL, "item_factors.npy"))
product_ids = np.load(
    os.path.join(MODEL, "model_product_ids.npy"),
    allow_pickle=True
)

with open(os.path.join(MODEL, "user_to_index.pkl"), "rb") as f:
    user_to_index = pickle.load(f)

with open(os.path.join(MODEL, "product_to_index.pkl"), "rb") as f:
    product_to_index = pickle.load(f)

print("Loading CLIP + SBERT embeddings...")

combined_embeddings = np.load(
    os.path.join(BASE, "combined_embeddings.npy")
).astype(np.float32)

combined_article_ids = np.load(
    os.path.join(BASE, "combined_article_ids.npy")
)

# Normalize multimodal embeddings
combined_embeddings /= (
    np.linalg.norm(combined_embeddings, axis=1, keepdims=True) + 1e-8
)

# Match embeddings to model products
embedding_index = {
    int(article_id): i
    for i, article_id in enumerate(combined_article_ids)
}

multimodal_embeddings = np.zeros(
    (len(product_ids), combined_embeddings.shape[1]),
    dtype=np.float32
)

valid = 0

for i, article_id in enumerate(product_ids):
    idx = embedding_index.get(int(article_id))

    if idx is not None:
        multimodal_embeddings[i] = combined_embeddings[idx]
        valid += 1

print("Products with multimodal embeddings:", valid)

# Normalize SVD item factors
item_norm = np.linalg.norm(item_factors, axis=1, keepdims=True)
item_factors_norm = item_factors / (item_norm + 1e-8)

# Normalize multimodal item embeddings
mm_norm = np.linalg.norm(
    multimodal_embeddings, axis=1, keepdims=True
)
multimodal_embeddings /= (mm_norm + 1e-8)

# Save normalized multimodal item embeddings
np.save(
    os.path.join(MODEL, "hybrid_item_embeddings.npy"),
    multimodal_embeddings
)

print("Building train user-item matrix...")

train = pd.read_csv(
    os.path.join(SPLITS, "train.csv"),
    usecols=["customer_id", "article_id"]
)

train["u"] = train["customer_id"].map(user_to_index)
train["i"] = train["article_id"].astype(str).str.zfill(10).map(product_to_index)

train = train.dropna(subset=["u", "i"])

train["u"] = train["u"].astype(np.int32)
train["i"] = train["i"].astype(np.int32)

# Remove duplicate user-item interactions
train = train.drop_duplicates(["u", "i"])

rows = train["u"].to_numpy()
cols = train["i"].to_numpy()

data = np.ones(len(train), dtype=np.float32)

user_item = csr_matrix(
    (data, (rows, cols)),
    shape=(len(user_factors), len(product_ids))
)

print("Train matrix:", user_item.shape)
print("Train interactions:", user_item.nnz)

del train
del rows
del cols
del data

print("Creating multimodal user profiles...")

profile_path = os.path.join(
    MODEL, "user_multimodal_profiles.npy"
)

profiles = np.lib.format.open_memmap(
    profile_path,
    mode="w+",
    dtype=np.float32,
    shape=(len(user_factors), multimodal_embeddings.shape[1])
)

BATCH_SIZE = 512

for start in tqdm(
    range(0, len(user_factors), BATCH_SIZE),
    desc="User profiles"
):
    end = min(start + BATCH_SIZE, len(user_factors))

    batch = user_item[start:end].dot(multimodal_embeddings)

    profiles[start:end] = batch.astype(np.float32)

    # Normalize each user profile
    norms = np.linalg.norm(
        profiles[start:end],
        axis=1,
        keepdims=True
    )

    profiles[start:end] /= (norms + 1e-8)

profiles.flush()

print("Hybrid model preparation completed.")

print()
print("Created:")
print("  capstone_data/model/hybrid_item_embeddings.npy")
print("  capstone_data/model/user_multimodal_profiles.npy")
print()
print("Hybrid score:")
print("  0.7 * collaborative SVD score")
print("  0.3 * CLIP + SBERT similarity")
