import os
import numpy as np
import torch
from PIL import Image
from tqdm import tqdm
from transformers import CLIPProcessor, CLIPModel

# ============================================================
# SETTINGS
# ============================================================

IMAGE_DIR = "capstone_data/images"
OUTPUT_FILE = "capstone_data/clip_embeddings.npy"
ID_FILE = "capstone_data/clip_article_ids.npy"

MODEL_NAME = "openai/clip-vit-base-patch32"

BATCH_SIZE = 16

# ============================================================
# DEVICE
# ============================================================

device = "cuda" if torch.cuda.is_available() else "cpu"

print("Device:", device)

if device == "cpu":
    print("Using CPU. This may take some time.")

# ============================================================
# LOAD CLIP
# ============================================================

print("\nLoading CLIP model...")

model = CLIPModel.from_pretrained(MODEL_NAME)
processor = CLIPProcessor.from_pretrained(MODEL_NAME)

model = model.to(device)
model.eval()

print("CLIP loaded successfully.")

# ============================================================
# FIND IMAGES
# ============================================================

image_files = [
    f for f in os.listdir(IMAGE_DIR)
    if f.lower().endswith(".jpg")
]

image_files.sort()

print("\nImages found:", len(image_files))

# ============================================================
# PROCESS IMAGES
# ============================================================

all_embeddings = []
article_ids = []

print("\nGenerating CLIP embeddings...")

for start in tqdm(
    range(0, len(image_files), BATCH_SIZE),
    desc="Processing images"
):

    batch_files = image_files[
        start:start + BATCH_SIZE
    ]

    images = []
    valid_ids = []

    for filename in batch_files:

        path = os.path.join(
            IMAGE_DIR,
            filename
        )

        try:

            image = Image.open(path).convert("RGB")

            images.append(image)

            article_id = os.path.splitext(
                filename
            )[0]

            valid_ids.append(article_id)

        except Exception as e:

            print(
                "\nSkipping:",
                filename,
                "| Error:",
                e
            )

    if not images:
        continue

    inputs = processor(
        images=images,
        return_tensors="pt"
    )

    inputs = {
        key: value.to(device)
        for key, value in inputs.items()
    }

    with torch.no_grad():

        vision_outputs = model.vision_model(**inputs)

        embeddings = vision_outputs.last_hidden_state[:, 0, :]

        embeddings = model.visual_projection(embeddings)

    # Normalize embeddings
    embeddings = embeddings / embeddings.norm(
        dim=-1,
        keepdim=True
    )

    all_embeddings.append(
        embeddings.cpu().numpy()
    )

    article_ids.extend(
        valid_ids
    )

# ============================================================
# SAVE
# ============================================================

print("\nCombining embeddings...")

embeddings = np.vstack(
    all_embeddings
)

article_ids = np.array(
    article_ids
)

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
print("CLIP PROCESSING COMPLETE")
print("========================================")

print("Images processed:", len(article_ids))
print("Embedding shape:", embeddings.shape)

print("\nFiles created:")

print(" ", OUTPUT_FILE)
print(" ", ID_FILE)
