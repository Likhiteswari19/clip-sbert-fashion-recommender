# H&M Fashion Recommendation System — Final Report

---

## 1. Project Overview

Built a **multimodal recommendation system** for H&M fashion products combining:
- **Collaborative filtering** (SVD matrix factorization on user-item interactions)
- **Content-based signals** (CLIP image embeddings + SBERT text embeddings)

The goal: determine whether adding multimodal content features improves recommendation quality, especially for users with limited interaction history.

---

## 2. Architecture & Workflow

```
H&M Raw Data (3 CSVs + 86 image folders)
    │
    ▼
┌─────────────────────┐
│ prepare_dataset.py   │ → products.csv (15K), customers.csv (1.07M),
│                      │ transactions.csv (22M), images (14,959)
└─────────────────────┘
    │
    ▼
┌─────────────────────┐
│ filter_images.py     │ → 14,959 valid product images
└─────────────────────┘
    │
    ▼
┌──────────────────────┐
│ clip_embeddings.py    │ → clip_embeddings.npy (14,959 × 512)
└──────────────────────┘
    │
    ▼
┌──────────────────────┐
│ sbert_embeddings.py   │ → sbert_embeddings.npy (15,000 × 384)
└──────────────────────┘
    │
    ▼
┌────────────────────────┐
│ combine_embeddings.py   │ → combined_embeddings.npy (14,959 × 896)
└────────────────────────┘
    │
    ▼
┌─────────────────────┐
│ prepare_splits.py    │ → train/validation/test + sparse subsets
└─────────────────────┘
    │
    ▼
┌─────────────────────────┐
│ train_recommender.py     │ → SVD model (128 components)
│                          │ user_factors (1.01M × 128)
│                          │ item_factors (14,959 × 128)
└─────────────────────────┘
    │
    ▼
┌─────────────────────────────┐
│ train_hybrid.py              │ → hybrid_item_embeddings (×896)
│                              │ user_multimodal_profiles (1.01M × 896)
└─────────────────────────────┘
    │
    ▼
┌──────────────────────────┐
│ evaluate_hybrid.py        │ → Precision/Recall/NDCG@10
└──────────────────────────┘
    │
    ▼
┌──────────────────────────────┐
│ evaluate_sparse.py            │ → Sparse-user specific eval
└──────────────────────────────┘
```

---

## 3. Methodology

### 3.1 Collaborative Filtering (SVD)
- Model: SVD (singular value decomposition) with 128 latent factors
- Input: User-item interaction matrix (1,015,097 users × 14,959 products, 15.3M interactions)
- Scoring: Cosine similarity between user factors and item factors

### 3.2 Multimodal Embeddings
- **CLIP**: 512-dimensional image embeddings from `clip_vit_large_patch14`
- **SBERT**: 384-dimensional text embeddings from `paraphrase-multilingual-MiniLM-L12-v2`
- **Combined**: 896-dimensional embedding (512 + 384), L2-normalized

### 3.3 Hybrid Scoring
```
Hybrid Score = 0.7 × SVD collaborative score (normalized)
             + 0.3 × CLIP + SBERT content similarity (normalized)
```

Both scores are independently min-max normalized to [0, 1] before combination.

### 3.4 User Profiles
User multimodal profiles are computed as the weighted sum (via matrix multiplication) of all items a user interacted with during training, using the 896-dimensional combined item embeddings. This creates a content-based "taste vector" per user.

### 3.5 Evaluation Protocol
- Metrics: Precision@10, Recall@10, NDCG@10
- Train items excluded from scoring (to prevent cheating)
- Evaluated on: validation set (563K users), test set (1.01M users), sparse-user test (329K users)

---

## 4. Results

### 4.1 Full Test Set (1,012,151 users)

| Metric | SVD | Hybrid | Change |
|--------|-----|--------|--------|
| Precision@10 | 0.0036 | 0.0047 | **+29.36%** |
| Recall@10 | 0.0279 | 0.0420 | **+50.36%** |
| NDCG@10 | 0.0212 | 0.0253 | **+19.22%** |

### 4.2 Sparse-User Test (328,812 users)

| Metric | SVD | Hybrid | Change |
|--------|-----|--------|--------|
| Precision@10 | 0.007856 | 0.009218 | **+17.34%** |
| Recall@10 | 0.078556 | 0.092180 | **+17.34%** |
| NDCG@10 | 0.049736 | 0.056178 | **+12.95%** |

### 4.3 Validation Set (563,251 users)

| Metric | SVD | Hybrid | Change |
|--------|-----|--------|--------|
| Precision@10 | 0.0041 | 0.0026 | **-35.72%** |
| Recall@10 | 0.0204 | 0.0155 | **-24.24%** |
| NDCG@10 | 0.0224 | 0.0095 | **-57.77%** |

### 4.4 Complete Comparison Table

| Metric | Dataset | SVD | Hybrid | Hybrid % |
|--------|---------|-----|--------|----------|
| P@10 | Validation | 0.0041 | 0.0026 | -35.72% |
| R@10 | Validation | 0.0204 | 0.0155 | -24.24% |
| NDCG@10 | Validation | 0.0224 | 0.0095 | -57.77% |
| P@10 | Test (Full) | 0.0036 | 0.0047 | +29.36% |
| R@10 | Test (Full) | 0.0279 | 0.0420 | +50.36% |
| NDCG@10 | Test (Full) | 0.0212 | 0.0253 | +19.22% |
| P@10 | Test (Sparse) | 0.007856 | 0.009218 | +17.34% |
| R@10 | Test (Sparse) | 0.078556 | 0.092180 | +17.34% |
| NDCG@10 | Test (Sparse) | 0.049736 | 0.056178 | +12.95% |

---

## 5. Analysis

### 5.1 Key Finding

**The hybrid model improved metrics on both the full test set and sparse-user test set, while metrics on the validation set decreased significantly.**

This is not a universal improvement claim — the validation regression is real and not yet explained.

### 5.2 Possible Explanations (Unverified Hypotheses)

1. **Validation set distribution**: The validation users may have interaction patterns that align more closely with the training distribution, where pure collaborative filtering excels. Content features may add noise in this regime.

2. **Score normalization sensitivity**: Min-max normalization of SVD scores per user amplifies small variations for users with unusual score distributions. The validation set may contain more such users.

3. **Sparsity of validation interactions**: If validation users have fewer held-out items, the precision metric (hits/K) becomes more sensitive to ranking perturbations from the content signal.

### 5.3 What the Sparse-User Result Tells Us

The hybrid model consistently improves metrics for users with limited history (+13-17%). This supports the hypothesis that multimodal content signals provide useful information when collaborative signals are weak.

However, the improvement is *smaller* on sparse users (+13-17%) than on the full test set (+19-50%), suggesting that hybrid benefits extend beyond just cold-start users.

### 5.4 Open Question

The validation regression requires further investigation before any claims about hybrid model superiority can be made. Possible next steps:
- Analyze validation vs test user interaction distributions
- Test with different alpha/beta ratios
- Try alternative normalization strategies
- Investigate whether the validation set has different data quality issues

---

## 6. Conclusion

**Accurate statement:** The hybrid model (0.7 × SVD + 0.3 × CLIP+SBERT) improved recommendation performance on the held-out test set and on sparse-history users, while performance on the validation set decreased.

**Key results:**
- Test set: +19-50% improvement across all three metrics
- Sparse users: +13-17% improvement across all three metrics
- Validation: -25-58% degradation across all three metrics

**The multimodal approach shows promise but requires further investigation to explain the validation regression before it can be recommended for production use.**

---

## 7. Project Files

| File | Purpose |
|------|---------|
| `prepare_dataset.py` | Raw data → structured CSVs + image folder |
| `filter_images.py` | Filter to products with valid images |
| `clip_embeddings.py` | CLIP image embeddings |
| `sbert_embeddings.py` | SBERT text embeddings |
| `combine_embeddings.py` | Concatenate CLIP + SBERT |
| `prepare_splits.py` | Train/val/test + sparse subsets |
| `train_recommender.py` | SVD model training |
| `train_hybrid.py` | Hybrid model preparation (profiles + embeddings) |
| `evaluate_model.py` | SVD-only evaluation |
| `evaluate_hybrid.py` | Hybrid model evaluation |
| `evaluate_sparse.py` | Sparse-user evaluation |
| `compare_models.py` | Model comparison table |
| `demo.py` | Interactive recommendation demo |
| `REPORT.md` | This report |

---

## 8. Presentation Points

1. **Problem**: Recommend fashion products to users with minimal history using image + text data
2. **Approach**: Two signals (collaborative + content) combined in a weighted hybrid
3. **Data scale**: 22M transactions, 1M users, 15K products, 15K images
4. **Key result**: Hybrid improves test performance by 19-50% and sparse-user performance by 13-17%
5. **Important caveat**: Validation regression means results are not yet conclusive
6. **Demo**: Interactive Top-10 recommendations using hybrid scoring
7. **Future work**: Explain validation gap, tune α/β ratio, try alternative fusion methods
