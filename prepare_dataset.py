import os
import pandas as pd
from tqdm import tqdm

RAW_DIR = "hm_raw"
OUTPUT_DIR = "capstone_data"

TARGET_PRODUCTS = 15000
MIN_PRODUCT_CUSTOMERS = 2
MIN_USER_PRODUCTS = 3
CHUNK_SIZE = 500_000

os.makedirs(OUTPUT_DIR, exist_ok=True)

ARTICLES_FILE = os.path.join(RAW_DIR, "articles.csv")
CUSTOMERS_FILE = os.path.join(RAW_DIR, "customers.csv")
TRANSACTIONS_FILE = os.path.join(RAW_DIR, "transactions_train.csv")

print("\nChecking input files...")

for file in [ARTICLES_FILE, CUSTOMERS_FILE, TRANSACTIONS_FILE]:
    if not os.path.exists(file):
        raise FileNotFoundError(f"File not found: {file}")
    print("Found:", file)

# ============================================================
# STEP 1 - ARTICLES
# ============================================================

print("\nSTEP 1: Loading articles")

article_columns = [
    "article_id",
    "product_code",
    "prod_name",
    "product_type_name",
    "product_group_name",
    "graphical_appearance_name",
    "colour_group_name",
    "perceived_colour_value_name",
    "perceived_colour_master_name",
    "department_name",
    "index_name",
    "index_group_name",
    "section_name",
    "garment_group_name",
    "detail_desc"
]

articles = pd.read_csv(
    ARTICLES_FILE,
    usecols=article_columns
)

articles["article_id"] = (
    articles["article_id"]
    .astype(str)
    .str.replace(".0", "", regex=False)
    .str.zfill(10)
)

print("Total articles:", len(articles))

# ============================================================
# STEP 2 - PROCESS TRANSACTIONS
# ============================================================

print("\nSTEP 2: Processing transactions")

product_customer_count = {}
user_product_count = {}

for chunk in tqdm(
    pd.read_csv(
        TRANSACTIONS_FILE,
        usecols=["customer_id", "article_id"],
        dtype={
            "customer_id": "string",
            "article_id": "string"
        },
        chunksize=CHUNK_SIZE
    ),
    desc="Reading transactions"
):

    chunk["article_id"] = (
        chunk["article_id"]
        .str.replace(".0", "", regex=False)
        .str.zfill(10)
    )

    product_counts = (
        chunk.groupby("article_id")["customer_id"]
        .nunique()
    )

    for article_id, count in product_counts.items():
        product_customer_count[article_id] = (
            product_customer_count.get(article_id, 0) + count
        )

    user_counts = (
        chunk.groupby("customer_id")["article_id"]
        .nunique()
    )

    for customer_id, count in user_counts.items():
        user_product_count[customer_id] = (
            user_product_count.get(customer_id, 0) + count
        )

print("Products found:", len(product_customer_count))
print("Customers found:", len(user_product_count))

# ============================================================
# STEP 3 - SELECT CUSTOMERS
# ============================================================

print("\nSTEP 3: Selecting customers")

good_customers = {
    customer_id
    for customer_id, count in user_product_count.items()
    if count >= MIN_USER_PRODUCTS
}

print("Customers with 3+ products:", len(good_customers))

# ============================================================
# STEP 4 - SELECT PRODUCTS
# ============================================================

print("\nSTEP 4: Selecting products")

product_stats = pd.DataFrame(
    [
        (article_id, count)
        for article_id, count in product_customer_count.items()
        if count >= MIN_PRODUCT_CUSTOMERS
    ],
    columns=["article_id", "customer_count"]
)

product_stats = product_stats.sort_values(
    "customer_count",
    ascending=False
)

selected_product_ids = set(
    product_stats.head(TARGET_PRODUCTS)["article_id"]
)

print("Selected products:", len(selected_product_ids))

# ============================================================
# STEP 5 - CREATE PRODUCTS
# ============================================================

print("\nSTEP 5: Creating products.csv")

products = articles[
    articles["article_id"].isin(selected_product_ids)
].copy()

products = products.merge(
    product_stats,
    on="article_id",
    how="left"
)

text_columns = [
    "prod_name",
    "product_type_name",
    "product_group_name",
    "graphical_appearance_name",
    "colour_group_name",
    "perceived_colour_value_name",
    "perceived_colour_master_name",
    "department_name",
    "index_name",
    "index_group_name",
    "section_name",
    "garment_group_name",
    "detail_desc"
]

products["product_text"] = (
    products[text_columns]
    .fillna("")
    .astype(str)
    .agg(" ".join, axis=1)
)

products.to_csv(
    os.path.join(OUTPUT_DIR, "products.csv"),
    index=False
)

print("Products saved:", len(products))

# ============================================================
# STEP 6 - CREATE CUSTOMERS
# ============================================================

print("\nSTEP 6: Creating customers.csv")

customers = pd.read_csv(
    CUSTOMERS_FILE,
    dtype={"customer_id": "string"}
)

customers = customers[
    customers["customer_id"].isin(good_customers)
].copy()

if "postal_code" in customers.columns:
    customers = customers.drop(columns=["postal_code"])

customers.to_csv(
    os.path.join(OUTPUT_DIR, "customers.csv"),
    index=False
)

print("Customers saved:", len(customers))

# ============================================================
# STEP 7 - FILTER TRANSACTIONS
# ============================================================

print("\nSTEP 7: Creating transactions.csv")

selected_transactions = []

for chunk in tqdm(
    pd.read_csv(
        TRANSACTIONS_FILE,
        usecols=[
            "t_dat",
            "customer_id",
            "article_id",
            "price",
            "sales_channel_id"
        ],
        dtype={
            "customer_id": "string",
            "article_id": "string"
        },
        chunksize=CHUNK_SIZE
    ),
    desc="Filtering transactions"
):

    chunk["article_id"] = (
        chunk["article_id"]
        .str.replace(".0", "", regex=False)
        .str.zfill(10)
    )

    filtered = chunk[
        chunk["customer_id"].isin(good_customers)
        &
        chunk["article_id"].isin(selected_product_ids)
    ]

    if not filtered.empty:
        selected_transactions.append(filtered)

if selected_transactions:
    transactions = pd.concat(
        selected_transactions,
        ignore_index=True
    )
else:
    transactions = pd.DataFrame(
        columns=[
            "t_dat",
            "customer_id",
            "article_id",
            "price",
            "sales_channel_id"
        ]
    )

transactions.to_csv(
    os.path.join(OUTPUT_DIR, "transactions.csv"),
    index=False
)

# ============================================================
# FINAL RESULT
# ============================================================

print("\n========================================")
print("DATASET PREPARATION COMPLETE")
print("========================================")

print("Products:", len(products))
print("Customers:", len(customers))
print("Transactions:", len(transactions))

print("\nFiles created:")
print("  products.csv")
print("  customers.csv")
print("  transactions.csv")

print("\nImages were NOT processed yet.")

print("\nNext step: matching the product images.")