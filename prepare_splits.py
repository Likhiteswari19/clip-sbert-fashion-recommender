import os
import pandas as pd
import numpy as np

TRANSACTIONS_FILE = "capstone_data/transactions.csv"

OUTPUT_DIR = "capstone_data/splits"

TEST_RATIO = 0.1
VAL_RATIO = 0.1

os.makedirs(OUTPUT_DIR, exist_ok=True)

print("Loading transactions...")
transactions = pd.read_csv(
    TRANSACTIONS_FILE,
    dtype={
        "customer_id": str,
        "article_id": str
    }
)
transactions["article_id"] = (
    transactions["article_id"]
    .str.replace(".0", "", regex=False)
    .str.zfill(10)
)
transactions["t_dat"] = pd.to_datetime(transactions["t_dat"])
print("Total:", len(transactions))

print("Sorting...")
transactions = transactions.sort_values(["customer_id", "t_dat"]).reset_index(drop=True)

print("Ranking...")
transactions["rank"] = transactions.groupby("customer_id").cumcount() + 1

print("Group sizes...")
group_sizes = transactions.groupby("customer_id").size()
transactions = transactions.merge(
    group_sizes.rename("total"),
    left_on="customer_id",
    right_index=True
)

print("Computing split boundaries...")
test_count = (transactions["total"] * TEST_RATIO).astype(int).clip(lower=1)
val_count = (transactions["total"] * VAL_RATIO).astype(int).clip(lower=0)

transactions["test_start"] = transactions["total"] - test_count + 1
transactions["val_start"] = transactions["test_start"] - val_count

print("Splitting...")
train = transactions[transactions["rank"] < transactions["val_start"]].copy()
val = transactions[
    (transactions["rank"] >= transactions["val_start"]) &
    (transactions["rank"] < transactions["test_start"])
].copy()
test = transactions[transactions["rank"] >= transactions["test_start"]].copy()

for df in [train, val, test]:
    if "t_dat" in df.columns:
        df.drop(columns=["t_dat"], inplace=True)
    if "rank" in df.columns:
        df.drop(columns=["rank"], inplace=True)
    if "total" in df.columns:
        df.drop(columns=["total"], inplace=True)
    if "test_start" in df.columns:
        df.drop(columns=["test_start"], inplace=True)
    if "val_start" in df.columns:
        df.drop(columns=["val_start"], inplace=True)

train.to_csv(os.path.join(OUTPUT_DIR, "train.csv"), index=False)
val.to_csv(os.path.join(OUTPUT_DIR, "validation.csv"), index=False)
test.to_csv(os.path.join(OUTPUT_DIR, "test.csv"), index=False)

print("\nSparse user analysis...")
user_train_counts = train.groupby("customer_id").size()
sparse_user_ids = user_train_counts[user_train_counts <= 5].index

train_sparse = train[train["customer_id"].isin(sparse_user_ids)]
val_sparse = val[val["customer_id"].isin(sparse_user_ids)]
test_sparse = test[test["customer_id"].isin(sparse_user_ids)]

train_sparse.to_csv(os.path.join(OUTPUT_DIR, "train_sparse_users.csv"), index=False)
val_sparse.to_csv(os.path.join(OUTPUT_DIR, "val_sparse_users.csv"), index=False)
test_sparse.to_csv(os.path.join(OUTPUT_DIR, "test_sparse_users.csv"), index=False)

print("Sparse users (<=5 train interactions):", len(sparse_user_ids))

print("\nNew product analysis...")
train_products = set(train["article_id"].unique())
test_products = set(test["article_id"].unique())
new_product_ids = test_products - train_products

test_new = test[test["article_id"].isin(new_product_ids)]
test_new.to_csv(os.path.join(OUTPUT_DIR, "test_new_products.csv"), index=False)

print("New products (test, not train):", len(new_product_ids))

print("\nDone.")
print("Train:", len(train))
print("Validation:", len(val))
print("Test:", len(test))
