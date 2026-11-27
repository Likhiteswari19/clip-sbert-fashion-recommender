import os
import pickle
import numpy as np
import pandas as pd
from scipy.sparse import csr_matrix
from tqdm import tqdm

BASE = "capstone_data"
MODEL = os.path.join(BASE, "model")
SPLITS = os.path.join(BASE, "splits")

K = 10
ALPHA = 0.7
BETA = 0.3
BATCH_SIZE = 256

print("=" * 60)
print("SPARSE-USER EVALUATION: SVD vs HYBRID")
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

print("Users:", len(user_factors))
print("Products:", len(item_factors))

# Normalize item factors for SVD
item_factor_norms = np.linalg.norm(item_factors, axis=1, keepdims=True)
item_factors_norm = (item_factors / (item_factor_norms + 1e-8)).astype(np.float32)

# Normalize item embeddings for content
item_embedding_norms = np.linalg.norm(item_embeddings, axis=1, keepdims=True)
item_embeddings_norm = (item_embeddings / (item_embedding_norms + 1e-8)).astype(np.float32)

# Load test_sparse_users.csv
print("\nLoading sparse test set...")
df = pd.read_csv(os.path.join(SPLITS, "test_sparse_users.csv"), usecols=["customer_id", "article_id"])
print("Sparse test rows:", len(df))

df["customer_id"] = df["customer_id"].astype(str)
df["article_id"] = df["article_id"].astype(str).str.zfill(10)

df["u"] = df["customer_id"].map(user_to_index)
df["i"] = df["article_id"].map(product_to_index)
df = df.dropna(subset=["u", "i"])
df["u"] = df["u"].astype(np.int32)
df["i"] = df["i"].astype(np.int32)
df = df.drop_duplicates(["u", "i"])
df = df.sort_values("u")

users = df["u"].to_numpy()
items = df["i"].to_numpy()

unique_users, start_positions = np.unique(users, return_index=True)
end_positions = np.append(start_positions[1:], len(users))

print("Sparse users in test:", len(unique_users))

# Build train user-item matrix for exclusion
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
    shape=(len(user_factors), len(item_factors))
)
print("Train interactions:", train_user_items.nnz)

del train
del rows
del cols


def evaluate_both_models(filename):
    total_precision_svd = 0.0
    total_recall_svd = 0.0
    total_ndcg_svd = 0.0
    total_precision_hyb = 0.0
    total_recall_hyb = 0.0
    total_ndcg_hyb = 0.0
    evaluated = 0

    print(f"\nEvaluating {len(unique_users)} sparse users...")

    for batch_start in tqdm(range(0, len(unique_users), BATCH_SIZE), desc=filename):
        batch_end = min(batch_start + BATCH_SIZE, len(unique_users))
        batch_users = unique_users[batch_start:batch_end]

        svd_scores = user_factors[batch_users] @ item_factors_norm.T
        content_scores = user_profiles[batch_users] @ item_embeddings_norm.T

        svd_min = svd_scores.min(axis=1, keepdims=True)
        svd_max = svd_scores.max(axis=1, keepdims=True)
        svd_scores = (svd_scores - svd_min) / (svd_max - svd_min + 1e-8)

        content_min = content_scores.min(axis=1, keepdims=True)
        content_max = content_scores.max(axis=1, keepdims=True)
        content_scores = (content_scores - content_min) / (content_max - content_min + 1e-8)

        hybrid_scores = ALPHA * svd_scores + BETA * content_scores

        for local_idx, user_idx in enumerate(batch_users):
            seen_items = train_user_items.getrow(user_idx).indices
            if len(seen_items) > 0:
                svd_scores[local_idx, seen_items] = -np.inf
                hybrid_scores[local_idx, seen_items] = -np.inf

            eval_start = start_positions[batch_start + local_idx]
            eval_end = end_positions[batch_start + local_idx]
            relevant = set(items[eval_start:eval_end])

            if not relevant:
                continue

            for scores, prefix in [(svd_scores, "svd"), (hybrid_scores, "hyb")]:
                if scores.shape[1] > K:
                    top_indices = np.argpartition(scores[local_idx], -K)[-K:]
                    top_indices = top_indices[np.argsort(scores[local_idx, top_indices])[::-1]]
                else:
                    top_indices = np.argsort(scores[local_idx])[::-1][:K]

                recommended = top_indices.tolist()
                hits = sum(1 for item in recommended if item in relevant)
                precision = hits / K
                recall = hits / len(relevant)

                dcg = 0.0
                for rank, item in enumerate(recommended, start=1):
                    if item in relevant:
                        dcg += 1.0 / np.log2(rank + 1)

                ideal_hits = min(len(relevant), K)
                idcg = sum(1.0 / np.log2(rank + 1) for rank in range(1, ideal_hits + 1))
                ndcg = dcg / idcg if idcg > 0 else 0.0

                if prefix == "svd":
                    total_precision_svd += precision
                    total_recall_svd += recall
                    total_ndcg_svd += ndcg
                else:
                    total_precision_hyb += precision
                    total_recall_hyb += recall
                    total_ndcg_hyb += ndcg

        evaluated += len(batch_users)

    n = evaluated
    return {
        "Precision@10": (total_precision_svd, total_precision_hyb),
        "Recall@10": (total_recall_svd, total_recall_hyb),
        "NDCG@10": (total_ndcg_svd, total_ndcg_hyb),
        "users": n,
    }


results = evaluate_both_models("test_sparse_users.csv")

print("\n" + "=" * 60)
print("SPARSE-USER RESULTS")
print("=" * 60)
print(f"\n{'Metric':<12} {'SVD':>10} {'Hybrid':>10} {'Diff':>10} {'% Chg':>10}")
print("-" * 56)

for metric in ["Precision@10", "Recall@10", "NDCG@10"]:
    svd_total, hyb_total = results[metric]
    n_users = results["users"]
    svd_val = svd_total / n_users
    hyb_val = hyb_total / n_users
    diff = hyb_val - svd_val
    pct = (diff / svd_val) * 100 if svd_val != 0 else float("inf")
    print(f"{metric:<12} {svd_val:>10.6f} {hyb_val:>10.6f} {diff:>+10.6f} {pct:>+9.2f}%")

improvements = {m: (results[m][1] - results[m][0]) / results[m][0] * 100 if results[m][0] != 0 else 0 for m in ["Precision@10", "Recall@10", "NDCG@10"]}
print(f"\nUsers evaluated: {results['users']}")
print(f"\nHybrid improvements over SVD on sparse users:")
for metric, pct in improvements.items():
    print(f"  {metric}: {pct:+.2f}%")
