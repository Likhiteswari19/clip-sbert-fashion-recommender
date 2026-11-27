import os
import shutil
import pandas as pd
from tqdm import tqdm

# ============================================================
# SETTINGS
# ============================================================

PRODUCTS_FILE = "capstone_data/products.csv"
SOURCE_DIR = "images"
OUTPUT_DIR = "capstone_data/images"

# ============================================================
# CREATE OUTPUT FOLDER
# ============================================================

os.makedirs(OUTPUT_DIR, exist_ok=True)

# ============================================================
# LOAD SELECTED PRODUCTS
# ============================================================

print("Loading selected products...")

products = pd.read_csv(
    PRODUCTS_FILE,
    dtype={"article_id": str}
)

products["article_id"] = (
    products["article_id"]
    .str.replace(".0", "", regex=False)
    .str.zfill(10)
)

selected_ids = set(products["article_id"])

print("Selected products:", len(selected_ids))

# ============================================================
# SEARCH IMAGE FOLDERS
# ============================================================

print("\nSearching images...")

found = 0
missing = []

for article_id in tqdm(
    selected_ids,
    desc="Finding product images"
):

    # H&M image folder is based on first 3 digits
    folder = article_id[:3]

    source_file = os.path.join(
        SOURCE_DIR,
        folder,
        article_id + ".jpg"
    )

    if os.path.exists(source_file):

        destination_file = os.path.join(
            OUTPUT_DIR,
            article_id + ".jpg"
        )

        shutil.copy2(
            source_file,
            destination_file
        )

        found += 1

    else:

        missing.append(article_id)

# ============================================================
# RESULTS
# ============================================================

print("\n========================================")
print("IMAGE FILTERING COMPLETE")
print("========================================")

print("Selected products:", len(selected_ids))
print("Images found:", found)
print("Images missing:", len(missing))

print("\nImages saved to:")
print(os.path.abspath(OUTPUT_DIR))

# ============================================================
# SAVE MISSING IMAGE LIST
# ============================================================

if missing:

    pd.DataFrame(
        {"article_id": missing}
    ).to_csv(
        "capstone_data/missing_images.csv",
        index=False
    )

    print("\nMissing image list saved:")
    print("capstone_data/missing_images.csv")

print("\nNext step: CLIP image processing.")
