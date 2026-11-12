#!/usr/bin/env bash
# Evaluate the trained MITRA-Lite adapter, fuse + quantise it, and write reports/summary.json for the deck.
set -euo pipefail
cd "$(dirname "$0")"
PY=.venv/bin/python
ADAPTER=${1:-adapters/mitra-lite}
$PY evaluate.py --model models/qwen2.5-1.5b-instruct --adapter "$ADAPTER" --sets handwritten test_unseen --limit 200 --out reports/tuned.json
$PY -m mlx_lm fuse --model models/qwen2.5-1.5b-instruct --adapter-path "$ADAPTER" --save-path models/mitra-lite-fused
$PY -m mlx_lm convert --hf-path models/mitra-lite-fused --mlx-path models/mitra-lite-4bit -q --q-bits 4
$PY - <<'EOF'
import json
b = json.load(open("reports/baseline_handwritten.json"))["results"]["handwritten"]
t = json.load(open("reports/tuned.json"))["results"]
summary = {
    "baseline": b,
    "tuned": t["handwritten"],
    "tuned_unseen": t.get("test_unseen"),
    "note": f"Hand-written set (n={b['n']}): item F1 {b['item_f1']:.0%} → {t['handwritten']['item_f1']:.0%}; "
            f"count exact {b['count_exact']:.0%} → {t['handwritten']['count_exact']:.0%}. Unseen-product test F1 "
            f"{t.get('test_unseen', {}).get('item_f1', 0):.0%}. Synthetic training data; real-shop accuracy to be measured in a pilot.",
}
json.dump(summary, open("reports/summary.json", "w"), indent=2)
print(summary["note"])
EOF
