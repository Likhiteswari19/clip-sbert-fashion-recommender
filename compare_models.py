import os
import pandas as pd
import numpy as np

BASE = "capstone_data"
MODEL = os.path.join(BASE, "model")

SVD_RESULTS = os.path.join(BASE, "evaluation_results.txt")
HYBRID_RESULTS = os.path.join(MODEL, "hybrid_evaluation_results.csv")

print("=" * 80)
print("MODEL COMPARISON: SVD vs HYBRID")
print("=" * 80)

svd_lines = open(SVD_RESULTS).read().strip().split("\n")
svd_data = {}
current = None
for line in svd_lines:
    if line.startswith("VALIDATION"):
        current = "validation"
        svd_data[current] = {}
    elif line.startswith("TEST"):
        current = "test"
        svd_data[current] = {}
    elif ":" in line and current:
        key, val = line.strip().split(":")
        svd_data[current][key.strip()] = float(val.strip().replace(",", ""))

hybrid_df = pd.read_csv(HYBRID_RESULTS)
hybrid_data = {}
for _, row in hybrid_df.iterrows():
    dataset = os.path.splitext(row["dataset"])[0]
    hybrid_data[dataset] = {
        "Precision@10": row["precision@10"],
        "Recall@10": row["recall@10"],
        "NDCG@10": row["ndcg@10"],
    }

metrics = ["Precision@10", "Recall@10", "NDCG@10"]
datasets = ["validation", "test"]

print("\n")
header = f"{'Metric':<15} {'Dataset':<12} {'SVD':>10} {'Hybrid':>10} {'Diff':>10} {'% Chg':>10}"
print(header)
print("-" * len(header))

for dataset in datasets:
    for metric in metrics:
        svd_val = svd_data[dataset][metric]
        hyb_val = hybrid_data[dataset][metric]
        diff = hyb_val - svd_val
        pct = (diff / svd_val) * 100 if svd_val != 0 else float("inf")
        print(
            f"{metric:<15} {dataset:<12} {svd_val:>10.6f} {hyb_val:>10.6f} "
            f"{diff:>+10.6f} {pct:>+9.2f}%"
        )
    print()

print("=" * 80)
print("SUMMARY")
print("=" * 80)

for dataset in datasets:
    print(f"\n{dataset.upper()}:")
    for metric in metrics:
        svd_val = svd_data[dataset][metric]
        hyb_val = hybrid_data[dataset][metric]
        diff = hyb_val - svd_val
        pct = (diff / svd_val) * 100 if svd_val != 0 else float("inf")
        winner = "Hybrid" if hyb_val > svd_val else "SVD"
        print(
            f"  {metric:<12}: SVD={svd_val:.6f}  Hybrid={hyb_val:.6f}  "
            f"[{winner} by {abs(pct):+.2f}%]"
        )

print()
print("=" * 80)
print("TRADEOFF ANALYSIS")
print("=" * 80)

val_total = sum(svd_data["validation"][m] for m in metrics)
hyb_val_total = sum(hybrid_data["validation"][m] for m in metrics)
test_total = sum(svd_data["test"][m] for m in metrics)
hyb_test_total = sum(hybrid_data["test"][m] for m in metrics)

val_diff = hyb_val_total - val_total
test_diff = hyb_test_total - test_total

print(f"\nValidation total: SVD={val_total:.6f}  Hybrid={hyb_val_total:.6f}  "
      f"[{'Hybrid' if hyb_val_total > val_total else 'SVD'} by {val_diff:+.6f}]")
print(f"Test total:       SVD={test_total:.6f}  Hybrid={hyb_test_total:.6f}  "
      f"[{'Hybrid' if hyb_test_total > test_total else 'SVD'} by {test_diff:+.6f}]")
print()
print("Observation:")
print("  Hybrid DECREASES validation metrics (generalization gap concern)")
print("  Hybrid INCREASES test metrics (better real-world performance)")
print("  Possible causes:")
print("    - Test set has more sparse users where content signals help")
print("    - Validation users overlap more with training distribution")
print("    - Content similarity provides useful signal for cold-start items/users")
