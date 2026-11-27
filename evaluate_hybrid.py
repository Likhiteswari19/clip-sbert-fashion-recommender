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
print("HYBRID MODEL EVALUATION")
print("=" * 60)

print("\nLoading model files...")

user_factors = np.load(
    os.path.join(MODEL, "user_factors.npy")
).astype(np.float32)

item_factors = np.load(
    os.path.join(MODEL, "item_factors.npy")
).astype(np.float32)

user_profiles = np.load(
    os.path.join(MODEL, "user_multimodal_profiles.npy")
).astype(np.float32)

item_embeddings = np.load(
    os.path.join(MODEL, "hybrid_item_embeddings.npy")
).astype(np.float32)

with open(os.path.join(MODEL, "user_to_index.pkl"), "rb") as f:
    user_to_index = pickle.load(f)

with open(os.path.join(MODEL, "product_to_index.pkl"), "rb") as f:
    product_to_index = pickle.load(f)

print("Users:", len(user_factors))
print("Products:", len(item_factors))
print("User profile shape:", user_profiles.shape)
print("Item embedding shape:", item_embeddings.shape)


# ---------------------------------------------------------
# NORMALIZE ITEM FEATURES
# ---------------------------------------------------------

print("\nNormalizing item factors...")

item_factor_norms = np.linalg.norm(
    item_factors,
    axis=1,
    keepdims=True
)

item_factors_norm = (
    item_factors /
    (item_factor_norms + 1e-8)
).astype(np.float32)

item_embedding_norms = np.linalg.norm(
    item_embeddings,
    axis=1,
    keepdims=True
)

item_embeddings_norm = (
    item_embeddings /
    (item_embedding_norms + 1e-8)
).astype(np.float32)


# ---------------------------------------------------------
# BUILD TRAIN USER-ITEM MATRIX
# ---------------------------------------------------------

print("\nLoading train interactions...")

train = pd.read_csv(
    os.path.join(SPLITS, "train.csv"),
    usecols=["customer_id", "article_id"]
)

print("Train rows:", len(train))

# IMPORTANT:
# article IDs are converted to zero-padded strings
# to match product_to_index keys.

train["customer_id"] = train["customer_id"].astype(str)
train["article_id"] = (
    train["article_id"]
    .astype(str)
    .str.zfill(10)
)

train["u"] = train["customer_id"].map(user_to_index)
train["i"] = train["article_id"].map(product_to_index)

train = train.dropna(subset=["u", "i"])

train["u"] = train["u"].astype(np.int32)
train["i"] = train["i"].astype(np.int32)

train = train.drop_duplicates(["u", "i"])

rows = train["u"].to_numpy()
cols = train["i"].to_numpy()

train_user_items = csr_matrix(
    (
        np.ones(len(train), dtype=np.float32),
        (rows, cols)
    ),
    shape=(len(user_factors), len(item_factors))
)

print("Train user-item matrix:", train_user_items.shape)
print("Unique train interactions:", train_user_items.nnz)

del train
del rows
del cols


# ---------------------------------------------------------
# LOAD EVALUATION DATA
# ---------------------------------------------------------

def load_eval_data(filename):

    print("\nLoading", filename)

    df = pd.read_csv(
        os.path.join(SPLITS, filename),
        usecols=["customer_id", "article_id"]
    )

    df["customer_id"] = df["customer_id"].astype(str)

    df["article_id"] = (
        df["article_id"]
        .astype(str)
        .str.zfill(10)
    )

    df["u"] = df["customer_id"].map(user_to_index)
    df["i"] = df["article_id"].map(product_to_index)

    df = df.dropna(subset=["u", "i"])

    df["u"] = df["u"].astype(np.int32)
    df["i"] = df["i"].astype(np.int32)

    # Remove duplicate user-item interactions
    df = df.drop_duplicates(["u", "i"])

    df = df.sort_values("u")

    users = df["u"].to_numpy()
    items = df["i"].to_numpy()

    return users, items


# ---------------------------------------------------------
# METRIC CALCULATION
# ---------------------------------------------------------

def evaluate(filename):

    users, items = load_eval_data(filename)

    if len(users) == 0:
        print("No evaluation interactions found.")
        return None

    unique_users, start_positions = np.unique(
        users,
        return_index=True
    )

    end_positions = np.append(
        start_positions[1:],
        len(users)
    )

    total_precision = 0.0
    total_recall = 0.0
    total_ndcg = 0.0

    evaluated_users = 0

    print(
        "\nEvaluating",
        len(unique_users),
        "users..."
    )

    for batch_start in tqdm(
        range(0, len(unique_users), BATCH_SIZE),
        desc=filename
    ):

        batch_end = min(
            batch_start + BATCH_SIZE,
            len(unique_users)
        )

        batch_users = unique_users[
            batch_start:batch_end
        ]

        # -------------------------------------------------
        # SVD collaborative score
        # -------------------------------------------------

        svd_scores = (
            user_factors[batch_users]
            @ item_factors_norm.T
        )

        # -------------------------------------------------
        # CLIP + SBERT content score
        # -------------------------------------------------

        content_scores = (
            user_profiles[batch_users]
            @ item_embeddings_norm.T
        )

        # -------------------------------------------------
        # Normalize both scores per user
        # -------------------------------------------------

        svd_min = svd_scores.min(axis=1, keepdims=True)
        svd_max = svd_scores.max(axis=1, keepdims=True)

        svd_scores = (
            svd_scores - svd_min
        ) / (
            svd_max - svd_min + 1e-8
        )

        content_min = content_scores.min(
            axis=1,
            keepdims=True
        )

        content_max = content_scores.max(
            axis=1,
            keepdims=True
        )

        content_scores = (
            content_scores - content_min
        ) / (
            content_max - content_min + 1e-8
        )

        # -------------------------------------------------
        # HYBRID SCORE
        # -------------------------------------------------

        scores = (
            ALPHA * svd_scores
            +
            BETA * content_scores
        )

        # -------------------------------------------------
        # Evaluate each user
        # -------------------------------------------------

        for local_idx, user_idx in enumerate(batch_users):

            # Correct: exclude ONLY products seen during TRAIN
            seen_items = train_user_items.getrow(
                user_idx
            ).indices

            if len(seen_items) > 0:
                scores[local_idx, seen_items] = -np.inf

            # Actual relevant evaluation items
            eval_start = start_positions[
                batch_start + local_idx
            ]

            eval_end = end_positions[
                batch_start + local_idx
            ]

            relevant = set(
                items[eval_start:eval_end]
            )

            if not relevant:
                continue

            # -------------------------------------------------
            # Top-K recommendation
            # -------------------------------------------------

            if scores.shape[1] > K:

                top_indices = np.argpartition(
                    scores[local_idx],
                    -K
                )[-K:]

                top_indices = top_indices[
                    np.argsort(
                        scores[
                            local_idx,
                            top_indices
                        ]
                    )[::-1]
                ]

            else:
                top_indices = np.argsort(
                    scores[local_idx]
                )[::-1][:K]

            recommended = top_indices.tolist()

            # -------------------------------------------------
            # Precision@K
            # -------------------------------------------------

            hits = sum(
                1 for item in recommended
                if item in relevant
            )

            precision = hits / K

            # -------------------------------------------------
            # Recall@K
            # -------------------------------------------------

            recall = hits / len(relevant)

            # -------------------------------------------------
            # NDCG@K
            # -------------------------------------------------

            dcg = 0.0

            for rank, item in enumerate(
                recommended,
                start=1
            ):

                if item in relevant:

                    dcg += 1.0 / np.log2(
                        rank + 1
                    )

            ideal_hits = min(
                len(relevant),
                K
            )

            idcg = sum(
                1.0 / np.log2(rank + 1)
                for rank in range(
                    1,
                    ideal_hits + 1
                )
            )

            ndcg = (
                dcg / idcg
                if idcg > 0
                else 0.0
            )

            total_precision += precision
            total_recall += recall
            total_ndcg += ndcg

            evaluated_users += 1

    if evaluated_users == 0:
        return None

    precision = (
        total_precision /
        evaluated_users
    )

    recall = (
        total_recall /
        evaluated_users
    )

    ndcg = (
        total_ndcg /
        evaluated_users
    )

    print("\n" + "=" * 60)
    print(filename, "RESULTS")
    print("=" * 60)

    print("Evaluated users :", evaluated_users)
    print(f"Precision@10    : {precision:.4f}")
    print(f"Recall@10       : {recall:.4f}")
    print(f"NDCG@10         : {ndcg:.4f}")

    return {
        "dataset": filename,
        "users": evaluated_users,
        "precision@10": precision,
        "recall@10": recall,
        "ndcg@10": ndcg
    }


# ---------------------------------------------------------
# RUN VALIDATION + TEST
# ---------------------------------------------------------

validation_result = evaluate("validation.csv")

test_result = evaluate("test.csv")


# ---------------------------------------------------------
# SAVE RESULTS
# ---------------------------------------------------------

results = []

if validation_result:
    validation_result["alpha"] = ALPHA
    validation_result["beta"] = BETA
    results.append(validation_result)

if test_result:
    test_result["alpha"] = ALPHA
    test_result["beta"] = BETA
    results.append(test_result)

results_df = pd.DataFrame(results)

output_file = os.path.join(
    MODEL,
    "hybrid_evaluation_results.csv"
)

results_df.to_csv(
    output_file,
    index=False
)

print("\n" + "=" * 60)
print("EVALUATION COMPLETED")
print("=" * 60)

print("\nResults saved to:")
print(output_file)

print("\nFinal results:")
print(results_df.to_string(index=False))
