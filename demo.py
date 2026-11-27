import os
import pickle
import numpy as np

BASE = "capstone_data"
MODEL = os.path.join(BASE, "model")
SPLITS = os.path.join(BASE, "splits")
K = 10
ALPHA = 0.7
BETA = 0.3

print("=" * 60)
print("RECOMMENDATION DEMO")
print("=" * 60)

print("\nLoading model files...")

user_factors = np.load(os.path.join(MODEL, "user_factors.npy")).astype(np.float32)
item_factors = np.load(os.path.join(MODEL, "item_factors.npy")).astype(np.float32)
user_profiles = np.load(os.path.join(MODEL, "user_multimodal_profiles.npy")).astype(np.float32)
item_embeddings = np.load(os.path.join(MODEL, "hybrid_item_embeddings.npy")).astype(np.float32)

with open(os.path.join(MODEL, "user_to_index.pkl"), "rb") as f:
    user_to_index = pickle.load(f)

with open(os.path.join(MODEL, "product_to_index.pkl"), "rb") as f:
    product_to_index = pickle.load(f)

with open(os.path.join(MODEL, "model_product_ids.npy"), "rb") as f:
    product_ids = np.load(f, allow_pickle=True)

index_to_product = {i: str(pid) for i, pid in enumerate(product_ids)}
index_to_user = {idx: uid for uid, idx in user_to_index.items()}

item_factor_norms = np.linalg.norm(item_factors, axis=1, keepdims=True)
item_factors_norm = (item_factors / (item_factor_norms + 1e-8)).astype(np.float32)

item_embedding_norms = np.linalg.norm(item_embeddings, axis=1, keepdims=True)
item_embeddings_norm = (item_embeddings / (item_embedding_norms + 1e-8)).astype(np.float32)

print("\nBuilding train user-item matrix...")
import pandas as pd
from scipy.sparse import csr_matrix

train = pd.read_csv(os.path.join(SPLITS, "train.csv"), usecols=["customer_id", "article_id"])
train["customer_id"] = train["customer_id"].astype(str)
train["article_id"] = train["article_id"].astype(str).str.zfill(10)
train["u"] = train["customer_id"].map(user_to_index)
train["i"] = train["article_id"].map(product_to_index)
train = train.dropna(subset=["u", "i"])
train["u"] = train["u"].astype(np.int32)
train["i"] = train["i"].astype(np.int32)
train = train.drop_duplicates(["u", "i"])

rows = train["u"].to_numpy()
cols = train["i"].to_numpy()
train_user_items = csr_matrix(
    (np.ones(len(train), dtype=np.float32), (rows, cols)),
    shape=(len(user_factors), len(product_ids))
)
print("Train interactions:", train_user_items.nnz)


def recommend_for_user(user_id):
    if user_id not in user_to_index:
        print(f"\nUser {user_id} not found in training data.")
        return

    u_idx = user_to_index[user_id]
    print(f"\nUser: {user_id}")
    print(f"User index: {u_idx}")

    train_items = train_user_items.getrow(u_idx).indices
    print(f"Training interactions: {len(train_items)}")

    svd_scores = user_factors[u_idx] @ item_factors_norm.T
    content_scores = user_profiles[u_idx] @ item_embeddings_norm.T

    svd_min, svd_max = svd_scores.min(), svd_scores.max()
    svd_scores = (svd_scores - svd_min) / (svd_max - svd_min + 1e-8)

    c_min, c_max = content_scores.min(), content_scores.max()
    content_scores = (content_scores - c_min) / (c_max - c_min + 1e-8)

    hybrid_scores = ALPHA * svd_scores + BETA * content_scores

    hybrid_scores[train_items] = -np.inf

    if len(hybrid_scores) > K:
        top = np.argpartition(hybrid_scores, -K)[-K:]
        top = top[np.argsort(hybrid_scores[top])[::-1]]
    else:
        top = np.argsort(hybrid_scores)[::-1][:K]

    print(f"\n{'Rank':<6} {'Article ID':<15} {'Hybrid Score':<14} {'SVD Score':<12} {'Content Score'}")
    print("-" * 65)
    for rank, idx in enumerate(top, 1):
        article = index_to_product.get(idx, "???")
        print(f"{rank:<6} {article:<15} {hybrid_scores[idx]:.6f}    {svd_scores[idx]:.6f}    {content_scores[idx]:.6f}")


def recommend_for_item(article_id):
    article_str = str(article_id).zfill(10)
    if article_str not in product_to_index:
        print(f"\nProduct {article_str} not found in catalog.")
        return

    i_idx = product_to_index[article_str]
    print(f"\nProduct: {article_str}")

    item_scores = hybrid_item = user_profiles @ item_embeddings_norm[i_idx]
    hybrid_item_scores = ALPHA * (user_factors @ item_factors_norm[i_idx]) + BETA * (user_profiles @ item_embeddings_norm[i_idx])

    print(f"\nSimilar items (by hybrid score):")
    print(f"{'Rank':<6} {'Article ID':<15} {'Hybrid Score'}")
    print("-" * 40)

    scores = hybrid_item_scores
    scores[train_user_items.getcol(i_idx).indices] = -np.inf

    top = np.argpartition(scores, -K)[-K:]
    top = top[np.argsort(scores[top])[::-1]]

    for rank, idx in enumerate(top, 1):
        article = index_to_product.get(idx, "???")
        print(f"{rank:<6} {article:<15} {scores[idx]:.6f}")


print("\n" + "=" * 60)
print("INTERACTIVE MODE")
print("=" * 60)
print("\nCommands:")
print("  user <customer_id>  - Get Top-10 recommendations for a user")
print("  item  <article_id>  - Find similar items")
print("  sample              - Demo with a random user")
print("  quit                - Exit")
print()

import random

sample_user = random.choice(list(user_to_index.keys()))
print(f"Try: user {sample_user}")
print()

while True:
    try:
        cmd = input(">>> ").strip().split(None, 1)
        if not cmd:
            continue

        action = cmd[0].lower()

        if action == "quit":
            break
        elif action == "user" and len(cmd) > 1:
            recommend_for_user(cmd[1].strip())
        elif action == "item" and len(cmd) > 1:
            recommend_for_item(cmd[1].strip())
        elif action == "sample":
            uid = random.choice(list(user_to_index.keys()))
            recommend_for_user(uid)
        else:
            print("Unknown command. Use: user <id>, item <id>, sample, quit")
    except (EOFError, KeyboardInterrupt):
        break

print("\nDemo finished.")
