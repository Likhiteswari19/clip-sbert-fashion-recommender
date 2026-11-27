import numpy as np

CLIP_EMB = "capstone_data/clip_embeddings.npy"
CLIP_IDS = "capstone_data/clip_article_ids.npy"

SBERT_EMB = "capstone_data/sbert_embeddings.npy"
SBERT_IDS = "capstone_data/sbert_article_ids.npy"

OUTPUT_EMB = "capstone_data/combined_embeddings.npy"
OUTPUT_IDS = "capstone_data/combined_article_ids.npy"

print("Loading CLIP embeddings...")
clip_embeddings = np.load(CLIP_EMB)
clip_ids = np.load(CLIP_IDS)
print("CLIP:", clip_embeddings.shape, len(clip_ids))

print("\nLoading SBERT embeddings...")
sbert_embeddings = np.load(SBERT_EMB)
sbert_ids = np.load(SBERT_IDS)
print("SBERT:", sbert_embeddings.shape, len(sbert_ids))

print("\nMatching article IDs...")

sbert_id_map = {}
for i, aid in enumerate(sbert_ids):
    sbert_id_map[aid] = i

matched_indices = []
for i, aid in enumerate(clip_ids):
    if aid in sbert_id_map:
        matched_indices.append((i, sbert_id_map[aid]))

print("Matched:", len(matched_indices), "/", len(clip_ids))

print("\nCombining embeddings...")

combined_clip = np.stack([clip_embeddings[i] for i, _ in matched_indices])
combined_sbert = np.stack([sbert_embeddings[j] for _, j in matched_indices])

combined_embeddings = np.concatenate(
    [combined_clip, combined_sbert],
    axis=1
)

combined_ids = clip_ids[[i for i, _ in matched_indices]]

print("\nSaving...")

np.save(OUTPUT_EMB, combined_embeddings)
np.save(OUTPUT_IDS, combined_ids)

print("\n========================================")
print("COMBINATION COMPLETE")
print("========================================")

print("Combined shape:", combined_embeddings.shape)
print("Article IDs:", len(combined_ids))

print("\nFiles created:")
print(" ", OUTPUT_EMB)
print(" ", OUTPUT_IDS)
