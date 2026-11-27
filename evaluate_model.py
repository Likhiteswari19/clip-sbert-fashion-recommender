import os
import numpy as np
import pandas as pd
import joblib
from tqdm import tqdm

MODEL_DIR = "capstone_data/model"
TRAIN_FILE = "capstone_data/splits/train.csv"
VAL_FILE = "capstone_data/splits/validation.csv"
TEST_FILE = "capstone_data/splits/test.csv"

K = 10

OUTPUT_FILE = "capstone_data/evaluation_results.txt"

# ============================================================
# LOAD MODEL
# ============================================================

print("Loading model...")

user_factors = np.load(os.path.join(MODEL_DIR, "user_factors.npy"))
item_factors = np.load(os.path.join(MODEL_DIR, "item_factors.npy"))

user_to_index = joblib.load(os.path.join(MODEL_DIR, "user_to_index.pkl"))
product_to_index = joblib.load(os.path.join(MODEL_DIR, "product_to_index.pkl"))

products = np.load(
    os.path.join(MODEL_DIR, "model_product_ids.npy"),
    allow_pickle=True
)

print("Model loaded.")

# ============================================================
# LOAD TRAINING ITEMS PER USER
# ============================================================

print("Loading training items...")

train_user_items = {
    cid: set(items)
    for cid, items in pd.read_csv(
        TRAIN_FILE,
        usecols=["customer_id", "article_id"],
        dtype={"customer_id": str, "article_id": str}
    ).assign(
        article_id=lambda df: df["article_id"]
        .astype(str)
        .str.replace(".0", "", regex=False)
        .str.zfill(10)
    ).groupby("customer_id")["article_id"]
}

print("Training users:", len(train_user_items))

# ============================================================
# HELPER FUNCTIONS
# ============================================================

def dcg(scores):
    return sum(
        s / np.log2(i + 2)
        for i, s in enumerate(scores)
    )

def ndcg(relevant, recommended):
    if len(relevant) == 0:
        return 0.0
    ideal = sorted(relevant, reverse=True)
    actual_dcg = dcg(recommended)
    ideal_dcg = dcg(ideal)
    if ideal_dcg == 0:
        return 0.0
    return actual_dcg / ideal_dcg

# ============================================================
# EVALUATE A SPLIT
# ============================================================

def evaluate_split(df, split_name):
    print(f"\nEvaluating {split_name}...")

    user_items_map = {
        cid: set(items)
        for cid, items in df.groupby("customer_id")["article_id"]
    }

    metrics = {
        "precision_at_k": [],
        "recall_at_k": [],
        "ndcg_at_k": [],
    }

    eval_users = [
        uid for uid in user_items_map
        if uid in user_to_index
    ]

    for customer_id in tqdm(
        eval_users,
        desc=f"{split_name} evaluation"
    ):
        user_idx = user_to_index[customer_id]
        user_items = user_items_map[customer_id]

        scores = user_factors[user_idx] @ item_factors.T

        seen_items = train_user_items.get(customer_id, set())
        for item in seen_items:
            if item in product_to_index:
                scores[product_to_index[item]] = -np.inf

        top_k_idx = np.argpartition(scores, -K)[-K:]
        top_k_idx = top_k_idx[
            np.argsort(scores[top_k_idx])[::-1]
        ]
        top_k_items = products[top_k_idx]

        hits = len(set(top_k_items) & user_items)

        precision = hits / K
        recall = (
            hits / len(user_items)
            if len(user_items) > 0
            else 0.0
        )

        rel_scores = [
            1.0 if item in user_items else 0.0
            for item in top_k_items
        ]
        ndcg_score = ndcg([1.0] * hits, rel_scores)

        metrics["precision_at_k"].append(precision)
        metrics["recall_at_k"].append(recall)
        metrics["ndcg_at_k"].append(ndcg_score)

    return {
        "split": split_name,
        "users_evaluated": len(metrics["precision_at_k"]),
        "precision_at_k": np.mean(metrics["precision_at_k"]),
        "recall_at_k": np.mean(metrics["recall_at_k"]),
        "ndcg_at_k": np.mean(metrics["ndcg_at_k"]),
    }

# ============================================================
# LOAD DATA
# ============================================================

print("Loading validation set...")
val = pd.read_csv(VAL_FILE, dtype={"customer_id": str, "article_id": str})
val["article_id"] = (
    val["article_id"]
    .astype(str)
    .str.replace(".0", "", regex=False)
    .str.zfill(10)
)
print("Validation interactions:", len(val))

print("Loading test set...")
test = pd.read_csv(TEST_FILE, dtype={"customer_id": str, "article_id": str})
test["article_id"] = (
    test["article_id"]
    .astype(str)
    .str.replace(".0", "", regex=False)
    .str.zfill(10)
)
print("Test interactions:", len(test))

# ============================================================
# RUN EVALUATION
# ============================================================

results = []
results.append(evaluate_split(val, "validation"))
results.append(evaluate_split(test, "test"))

# ============================================================
# PRINT AND SAVE RESULTS
# ============================================================

print("\n" + "=" * 50)
print("EVALUATION RESULTS")
print("=" * 50)

lines = []

for r in results:
    print(f"\n{r['split'].upper()}")
    print(f"  Users evaluated: {r['users_evaluated']:,}")
    print(f"  Precision@{K}: {r['precision_at_k']:.4f}")
    print(f"  Recall@{K}: {r['recall_at_k']:.4f}")
    print(f"  NDCG@{K}: {r['ndcg_at_k']:.4f}")

    lines.append(f"{r['split'].upper()}")
    lines.append(f"  Users evaluated: {r['users_evaluated']:,}")
    lines.append(f"  Precision@{K}: {r['precision_at_k']:.4f}")
    lines.append(f"  Recall@{K}: {r['recall_at_k']:.4f}")
    lines.append(f"  NDCG@{K}: {r['ndcg_at_k']:.4f}")

with open(OUTPUT_FILE, "w") as f:
    f.write("\n".join(lines))

print(f"\nResults saved to: {OUTPUT_FILE}")
