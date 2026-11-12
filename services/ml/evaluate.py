"""Evaluate MITRA-Lite (or the base model) on extraction.

Metrics (per set): JSON validity, item precision/recall/F1 (normalized_item exact, case-insensitive), ask_count exact on
matched items, reason accuracy on matched items, negative accuracy (expects [] and gets []), and latency.
Usage:  .venv/bin/python evaluate.py --model models/qwen2.5-1.5b-instruct [--adapter adapters/mitra-lite] --sets handwritten test_unseen
"""

from __future__ import annotations

import argparse
import json
import re
import time
from pathlib import Path

from mlx_lm import generate, load
from mlx_lm.sample_utils import make_sampler

from datagen import SYSTEM


def norm(s: str) -> str:
    return re.sub(r"\s+", " ", (s or "").strip().lower())


def parse(text: str):
    m = re.search(r"\{.*\}", text, re.S)
    if not m:
        return None
    try:
        return json.loads(m.group(0))
    except json.JSONDecodeError:
        return None


def load_set(name: str, limit: int | None):
    rows = []
    if name == "handwritten":
        for line in open("evals/handwritten.jsonl", encoding="utf-8"):
            r = json.loads(line)
            user = "CATALOG: " + (", ".join(r["catalog"]) or "(empty)") + "\nNOTE: " + r["note"]
            rows.append((user, r["expected"]))
    else:
        for line in open(f"data/{name}.jsonl", encoding="utf-8"):
            m = json.loads(line)["messages"]
            rows.append((m[1]["content"], json.loads(m[2]["content"])["requests"]))
    return rows[:limit] if limit else rows


def run(model, tok, rows, max_tokens=320):
    sampler = make_sampler(temp=0.0)
    tp = fp = fn = cnt_ok = rsn_ok = matched = valid = neg_total = neg_ok = 0
    lat = []
    failures = []
    for user, exp in rows:
        prompt = tok.apply_chat_template([{"role": "system", "content": SYSTEM}, {"role": "user", "content": user}],
                                         add_generation_prompt=True, tokenize=False)
        t0 = time.time()
        out = generate(model, tok, prompt=prompt, max_tokens=max_tokens, sampler=sampler, verbose=False)
        lat.append(time.time() - t0)
        got = parse(out)
        if got is None or not isinstance(got.get("requests"), list):
            fn += len(exp)
            if not exp:
                neg_total += 1
            failures.append((user, "INVALID JSON", out[:200]))
            continue
        valid += 1
        g = {norm(r.get("normalized_item", "")): r for r in got["requests"] if isinstance(r, dict)}
        e = {norm(r["normalized_item"]): r for r in exp}
        if not exp:
            neg_total += 1
            neg_ok += int(not g)
        for k, er in e.items():
            if k in g:
                tp += 1
                matched += 1
                cnt_ok += int(g[k].get("ask_count") == er["ask_count"])
                rsn_ok += int(g[k].get("reason") == er["reason"])
            else:
                fn += 1
        extra = [k for k in g if k not in e]
        fp += len(extra)
        if extra or len([k for k in e if k not in g]):
            failures.append((user.split("NOTE: ")[-1], sorted(e), sorted(g)))
    p = tp / (tp + fp) if tp + fp else 0.0
    r = tp / (tp + fn) if tp + fn else 0.0
    return {
        "n": len(rows), "json_valid": round(valid / len(rows), 3), "item_precision": round(p, 3), "item_recall": round(r, 3),
        "item_f1": round(2 * p * r / (p + r), 3) if p + r else 0.0,
        "count_exact": round(cnt_ok / matched, 3) if matched else 0.0, "reason_acc": round(rsn_ok / matched, 3) if matched else 0.0,
        "negatives_correct": f"{neg_ok}/{neg_total}", "latency_p50_s": round(sorted(lat)[len(lat) // 2], 2),
    }, failures


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--model", required=True)
    ap.add_argument("--adapter", default=None)
    ap.add_argument("--sets", nargs="+", default=["handwritten", "test_unseen", "test_seen"])
    ap.add_argument("--limit", type=int, default=None)
    ap.add_argument("--out", default=None)
    a = ap.parse_args()
    model, tok = load(a.model, adapter_path=a.adapter)
    report = {"model": a.model, "adapter": a.adapter, "results": {}}
    for s in a.sets:
        res, fails = run(model, tok, load_set(s, a.limit))
        report["results"][s] = res
        print(s, json.dumps(res))
        for f in fails[:6]:
            print("   miss:", f)
    if a.out:
        Path(a.out).write_text(json.dumps(report, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
