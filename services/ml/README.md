# MITRA-Lite: our own offline extraction model

A LoRA fine-tune of **Qwen2.5-1.5B-Instruct** (Apache-2.0) on Apple MLX that turns a shopkeeper's Tamil, Tanglish or English note into structured missed-demand JSON. It runs on the shop's laptop with **no internet**, and sits in the API's AI chain: cloud model (if online and allowed) → **MITRA-Lite** → deterministic rules.

## Reproduce

```bash
cd services/ml && uv venv --python 3.12 .venv && uv pip install --python .venv/bin/python mlx-lm fastapi "uvicorn[standard]" python-multipart
```

```bash
.venv/bin/python -c "from huggingface_hub import snapshot_download as d; d('Qwen/Qwen2.5-1.5B-Instruct', local_dir='models/qwen2.5-1.5b-instruct')"
```

```bash
.venv/bin/python datagen.py --train 14000 && .venv/bin/python -m mlx_lm lora --config lora.yaml
```

```bash
./finish.sh
```

`finish.sh` evaluates the adapter on the held-out sets, fuses it into the base model, quantises to 4-bit (`models/mitra-lite-4bit`, about 0.9 GB) and writes `reports/summary.json`, which the pitch deck reads.

## Data (`datagen.py`)

- 14,000 synthetic training notes, labelled exactly by construction. They cover about 190 kirana products: a curated Tamil-script and Tanglish lexicon plus open-vocabulary items.
- Phrasing covers counts as digits, English and Tamil number words, vague counts and ranges; five reasons; sizes and brand ambiguity; multi-item notes; negatives (sales talk); and prompt-injection attempts, which must yield `[]`.
- **Held-out sets:** `test_seen` (same products), `test_unseen` (22 products never seen in training) and `evals/handwritten.jsonl` (40 notes written by hand, not from templates). The honest headline number comes from the hand-written set.

## Serve

```bash
../../scripts/dev-ml.sh
```

The server listens on `127.0.0.1:8090`: `GET /health`, `POST /extract`. Offline speech (`POST /transcribe`) works only if you install an mlx-whisper model and set `MITRA_WHISPER_MODEL`; it isn't bundled. In the app, **Settings → AI mode → Offline only** routes every note to MITRA-Lite.

## Limits (honest)

The training data is synthetic. Accuracy on real shop audio and phrasing must be measured in a pilot. The model only extracts; it never computes money or takes actions.
