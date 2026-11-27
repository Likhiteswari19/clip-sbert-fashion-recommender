import os
import numpy as np
import pandas as pd
from tqdm import tqdm
from scipy.sparse import csr_matrix
from sklearn.decomposition import TruncatedSVD
import joblib

# ============================================================
# SETTINGS
# ============================================================

TRAIN_FILE = "capstone_data/splits/train.csv"
EMBEDDINGS_FILE = "capstone_data/combined_embeddings.npy"
ARTICLE_IDS_FILE = "capstone_data/combined_article_ids.npy"

OUTPUT_DIR = "capstone_data/model"

N_COMPONENTS = 128

os.makedirs(OUTPUT_DIR, exist_ok=True)

# ============================================================
# LOAD TRAINING DATA
# ============================================================

print("Loading training data...")

train = pd.read_csv(
    TRAIN_FILE,
    usecols=["customer_id", "article_id"]
)

train["customer_id"] = train["customer_id"].astype(str)

train["article_id"] = (
    train["article_id"]
    .astype(str)
    .str.replace(".0", "", regex=False)
    .str.zfill(10)
)

print("Training interactions:", len(train))
print("Unique users:", train["customer_id"].nunique())
print("Unique products:", train["article_id"].nunique())

# ============================================================
# LOAD PRODUCT EMBEDDINGS
# ============================================================

print("\nLoading CLIP + SBERT embeddings...")

embeddings = np.load(
    EMBEDDINGS_FILE
)

article_ids = np.load(
    ARTICLE_IDS_FILE
).astype(str)

article_ids = np.char.zfill(article_ids, 10)

print("Embedding shape:", embeddings.shape)

# ============================================================
# KEEP PRODUCTS PRESENT IN TRAINING
# ============================================================

embedding_index = {
    article_id: i
    for i, article_id in enumerate(article_ids)
}

train = train[
    train["article_id"].isin(embedding_index)
].copy()

print(
    "Interactions with image+text features:",
    len(train)
)

# ============================================================
# CREATE USER / PRODUCT INDEX
# ============================================================

print("\nCreating user and product indices...")

users = train["customer_id"].unique()

products = train["article_id"].unique()

user_to_index = {
    user: i
    for i, user in enumerate(users)
}

product_to_index = {
    product: i
    for i, product in enumerate(products)
}

print("Users:", len(users))
print("Products:", len(products))

# ============================================================
# CREATE USER-ITEM MATRIX
# ============================================================

print("\nCreating user-item matrix...")

rows = train["customer_id"].map(user_to_index).to_numpy()

cols = train["article_id"].map(product_to_index).to_numpy()

data = np.ones(
    len(train),
    dtype=np.float32
)

user_item_matrix = csr_matrix(
    (
        data,
        (rows, cols)
    ),
    shape=(
        len(users),
        len(products)
    )
)

print(
    "Matrix shape:",
    user_item_matrix.shape
)

print(
    "Interactions:",
    user_item_matrix.nnz
)

# ============================================================
# TRAIN COLLABORATIVE MODEL
# ============================================================

print("\nTraining recommendation model...")

svd = TruncatedSVD(
    n_components=N_COMPONENTS,
    random_state=42
)

user_factors = svd.fit_transform(
    user_item_matrix
)

item_factors = svd.components_.T

print(
    "User factors:",
    user_factors.shape
)

print(
    "Item factors:",
    item_factors.shape
)

print(
    "Explained variance:",
    svd.explained_variance_ratio_.sum()
)

# ============================================================
# SAVE MODEL
# ============================================================

print("\nSaving model...")

np.save(
    os.path.join(
        OUTPUT_DIR,
        "user_factors.npy"
    ),
    user_factors
)

np.save(
    os.path.join(
        OUTPUT_DIR,
        "item_factors.npy"
    ),
    item_factors
)

np.save(
    os.path.join(
        OUTPUT_DIR,
        "model_product_ids.npy"
    ),
    products
)

joblib.dump(
    user_to_index,
    os.path.join(
        OUTPUT_DIR,
        "user_to_index.pkl"
    )
)

joblib.dump(
    product_to_index,
    os.path.join(
        OUTPUT_DIR,
        "product_to_index.pkl"
    )
)

joblib.dump(
    svd,
    os.path.join(
        OUTPUT_DIR,
        "svd_model.pkl"
    )
)

# ============================================================
# SAVE EMBEDDINGS FOR MODEL PRODUCTS
# ============================================================

model_embeddings = np.vstack([
    embeddings[embedding_index[article_id]]
    for article_id in products
])

np.save(
    os.path.join(
        OUTPUT_DIR,
        "model_product_embeddings.npy"
    ),
    model_embeddings
)

# ============================================================
# COMPLETE
# ============================================================

print("\n========================================")
print("RECOMMENDATION MODEL COMPLETE")
print("========================================")

print("Users:", len(users))
print("Products:", len(products))
print("User factors:", user_factors.shape)
print("Item factors:", item_factors.shape)
print(
    "Multimodal embeddings:",
    model_embeddings.shape
)

print("\nModel saved in:")
print(os.path.abspath(OUTPUT_DIR))
