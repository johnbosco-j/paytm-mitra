#!/usr/bin/env bash
# MITRA-Lite v2 overnight: train (resume from v1) -> evaluate on the same held-out notes -> promote only if better.
set -uo pipefail
cd "$(dirname "$0")"
PY=.venv/bin/python
echo "[$(date)] training v2"
$PY -m mlx_lm lora --config lora_v2.yaml > reports/train_v2.log 2>&1 || { echo "training failed"; exit 1; }
echo "[$(date)] evaluating v2"
$PY evaluate.py --model models/qwen2.5-1.5b-instruct --adapter adapters/mitra-lite-v2 --sets handwritten test_unseen --limit 100 \
  --out reports/tuned_v2.json > reports/eval_v2.log 2>&1
$PY - <<'PYEOF'
import json, shutil, subprocess, sys

v1 = json.load(open("reports/tuned.json"))["results"]["handwritten"]
v2 = json.load(open("reports/tuned_v2.json"))["results"]["handwritten"]
score = lambda r: r["item_f1"] + r["count_exact"] + r["reason_acc"]
print("v1 item_f1", v1["item_f1"], "| v2 item_f1", v2["item_f1"])
if score(v2) <= score(v1):
    print("v2 is not better; keeping v1")
    sys.exit(0)
py = ".venv/bin/python"
subprocess.run([py, "-m", "mlx_lm", "fuse", "--model", "models/qwen2.5-1.5b-instruct", "--adapter-path", "adapters/mitra-lite-v2",
                "--save-path", "models/v2-fused"], check=True)
subprocess.run([py, "-m", "mlx_lm", "convert", "--hf-path", "models/v2-fused", "--mlx-path", "models/v2-4bit", "-q", "--q-bits", "4"], check=True)
shutil.rmtree("models/v2-fused")
shutil.move("models/mitra-lite-4bit", "models/mitra-lite-4bit-v1")
shutil.move("models/v2-4bit", "models/mitra-lite-4bit")
s = json.load(open("reports/summary.json"))
s.update(checkpoint="v2 (brand-rich data, +1500 steps)", tuned=v2,
         tuned_unseen=json.load(open("reports/tuned_v2.json"))["results"]["test_unseen"])
json.dump(s, open("reports/summary.json", "w"), indent=2)
print("promoted v2 -> models/mitra-lite-4bit (restart scripts/dev-ml.sh to load it; rebuild the deck to show it)")
PYEOF
echo "[$(date)] done"
