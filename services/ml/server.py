"""MITRA-Lite local inference server: our fine-tuned Qwen2.5-1.5B (LoRA, Apple MLX). Runs fully offline.

Endpoints (bound to 127.0.0.1 only):
  GET  /health      -> {"ok", "model", "speech"}
  POST /extract     {"note": str, "catalog": [str]} -> {"language","english_gloss","requests":[...],"model"}
  POST /transcribe  (multipart audio) -> {"text"}   only if an mlx-whisper model is installed locally
Start:  scripts/dev-ml.sh   (env: MITRA_LITE_MODEL, MITRA_LITE_ADAPTER, MITRA_WHISPER_MODEL)
"""

from __future__ import annotations

import json
import os
import re
import threading
import time
from pathlib import Path

from contextlib import asynccontextmanager

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from pydantic import BaseModel, Field

from datagen import SYSTEM

HERE = Path(__file__).parent
FUSED = HERE / "models" / "mitra-lite-4bit"
MODEL = os.environ.get("MITRA_LITE_MODEL") or (str(FUSED) if FUSED.exists() else str(HERE / "models" / "qwen2.5-1.5b-instruct"))
ADAPTER = os.environ.get("MITRA_LITE_ADAPTER") or (None if FUSED.exists() else str(HERE / "adapters" / "mitra-lite"))
WHISPER = os.environ.get("MITRA_WHISPER_MODEL") or (str(HERE / "models" / "whisper-large-v3-turbo") if (HERE / "models" / "whisper-large-v3-turbo").exists() else None)

# shop-vocabulary primers that nudge Whisper toward shop words in a few languages
PROMPTS = {
    "ta": "கடை, வாடிக்கையாளர், கேட்டாங்க, லஸ்ஸி, பால், மாவு",
    "hi": "दुकान, ग्राहक, माँगा, दूध, आटा, लस्सी",
    "te": "దుకాణం, కస్టమర్, అడిగారు, పాలు, పిండి",
    "ml": "കട, ഉപഭോക്താവ്, ചോദിച്ചു, പാൽ, മാവ്",
    "kn": "ಅಂಗಡಿ, ಗ್ರಾಹಕ, ಕೇಳಿದರು, ಹಾಲು, ಹಿಟ್ಟು",
    "bn": "দোকান, খদ্দের, চাইল, দুধ, আটা",
}
_lock = threading.Lock()  # MLX generation is not re-entrant; serialise requests
_state: dict = {"warm": False}


def _warmup():
    """Load both models and run one tiny pass each, so the first real voice note is fast (cold start was ~50 s)."""
    try:
        t0 = time.time()
        from mlx_lm import generate

        st = _load()
        with _lock:
            generate(st["model"], st["tok"], prompt="hi", max_tokens=1, sampler=st["sampler"], verbose=False)
        if WHISPER and Path(WHISPER).exists():
            import numpy as np
            import mlx_whisper

            with _lock:
                mlx_whisper.transcribe(np.zeros(16000, dtype=np.float32), path_or_hf_repo=WHISPER, language="ta")
        _state["warm"] = True
        print(f"[mitra-lite] warm in {time.time() - t0:.1f}s", flush=True)
    except Exception as e:  # warm-up is best effort; requests still load lazily
        print(f"[mitra-lite] warm-up skipped: {e}", flush=True)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    if os.environ.get("MITRA_ML_WARMUP", "1") != "0":
        threading.Thread(target=_warmup, daemon=True).start()
    yield


app = FastAPI(title="MITRA-Lite", version="1.0", lifespan=lifespan)


def _load():
    if "model" not in _state:
        from mlx_lm import load
        from mlx_lm.sample_utils import make_sampler

        adapter = ADAPTER if ADAPTER and Path(ADAPTER, "adapters.safetensors").exists() else None
        _state["model"], _state["tok"] = load(MODEL, adapter_path=adapter)
        _state["sampler"] = make_sampler(temp=0.0)
        _state["name"] = "mitra-lite-1.5b" + ("" if adapter is None and "mitra-lite" in MODEL else ("-lora" if adapter else "-base"))
    return _state


class ExtractIn(BaseModel):
    note: str = Field(min_length=1, max_length=2000)
    catalog: list[str] = Field(default_factory=list, max_length=60)


@app.get("/health")
def health():
    return {"ok": True, "model": _state.get("name", Path(MODEL).name), "speech": bool(WHISPER and Path(WHISPER).exists()),
            "loaded": "model" in _state, "warm": _state["warm"]}


@app.post("/extract")
def extract(body: ExtractIn):
    from mlx_lm import generate

    st = _load()
    user = "CATALOG: " + (", ".join(c[:60] for c in body.catalog) or "(empty)") + "\nNOTE: " + body.note
    prompt = st["tok"].apply_chat_template([{"role": "system", "content": SYSTEM}, {"role": "user", "content": user}],
                                           add_generation_prompt=True, tokenize=False)
    t0 = time.time()
    with _lock:
        out = generate(st["model"], st["tok"], prompt=prompt, max_tokens=360, sampler=st["sampler"], verbose=False)
    m = re.search(r"\{.*\}", out, re.S)
    if not m:
        raise HTTPException(502, "model returned no JSON")
    try:
        data = json.loads(m.group(0))
    except json.JSONDecodeError as e:
        raise HTTPException(502, "model returned invalid JSON") from e
    data["model"] = st["name"]
    data["latency_ms"] = int((time.time() - t0) * 1000)
    return data


@app.post("/transcribe")
async def transcribe(audio: UploadFile = File(...), language: str = Form("")):
    if not (WHISPER and Path(WHISPER).exists()):
        raise HTTPException(501, "No offline speech model installed")
    import tempfile

    import mlx_whisper

    with tempfile.NamedTemporaryFile(suffix=".wav") as f:
        f.write(await audio.read())
        f.flush()
        with _lock:
            from mlx_whisper.tokenizer import LANGUAGES

            lang = language if language in LANGUAGES else None  # None = let Whisper detect (14 of the 22 are supported)
            prompt = PROMPTS.get(lang or "", None)
            r = mlx_whisper.transcribe(f.name, path_or_hf_repo=WHISPER, language=lang, task="transcribe", initial_prompt=prompt)
    return {"text": r.get("text", ""), "language": r.get("language", lang)}
