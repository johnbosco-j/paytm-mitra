"""Sarvam AI adapter: every model call in MITRA goes through here.

  stt()      POST /speech-to-text          saaras (22 Indian languages + English, code-mix mode, <= 30 s)
  generate() POST /v1/chat/completions     sarvam-105b (language understanding only; never money)
  tts()      POST /text-to-speech          bulbul (11 languages) -> WAV bytes

Each call is written to the `ai_calls` ledger and counted against a daily cap (MITRA_SARVAM_DAILY_CAP) so a demo
can't burn the credit balance; over the cap the caller falls back to rules / typed entry. The key comes from
MITRA_SARVAM_API_KEY and is never logged.
"""

from __future__ import annotations

import base64
import hashlib
import json
import logging
import re
import time
from datetime import UTC, datetime, timedelta

import httpx

from . import langs
from .config import get_settings

log = logging.getLogger("mitra.sarvam")
BASE = "https://api.sarvam.ai"
TTS_LANGS = {"hi", "bn", "ta", "te", "gu", "kn", "ml", "mr", "pa", "or", "en"}
_tts_cache: dict[str, bytes] = {}


class SarvamError(RuntimeError):
    pass


def enabled() -> bool:
    s = get_settings()
    return s.ai_provider != "none" and bool(s.sarvam_api_key)


def _headers() -> dict:
    return {"api-subscription-key": get_settings().sarvam_api_key}


def _ledger(endpoint: str, units: float, ok: bool, ms: int) -> None:
    """Best-effort usage row; never breaks the request."""
    try:
        from .db import SessionLocal
        from .models import AiCall

        with SessionLocal() as db:
            db.add(AiCall(endpoint=endpoint, units=units, ok=ok, latency_ms=ms))
            db.commit()
    except Exception:
        log.warning("ai ledger write failed")


def calls_today() -> int:
    try:
        from sqlalchemy import func, select

        from .db import SessionLocal
        from .models import AiCall

        since = datetime.now(UTC) - timedelta(hours=24)
        with SessionLocal() as db:
            return int(db.scalar(select(func.count()).select_from(AiCall).where(AiCall.created_at >= since)) or 0)
    except Exception:
        return 0


def _check_budget() -> None:
    cap = get_settings().sarvam_daily_cap
    if cap and calls_today() >= cap:
        raise SarvamError("AI budget for today is used up. Typed entry and the manual form still work.")


def _post(endpoint: str, units: float, **kw) -> dict:
    _check_budget()
    t0 = time.time()
    try:
        r = httpx.post(BASE + endpoint, headers=_headers(), timeout=get_settings().sarvam_timeout_s, **kw)
    except httpx.HTTPError as e:
        _ledger(endpoint, units, False, int((time.time() - t0) * 1000))
        raise SarvamError(f"Sarvam {endpoint}: network {type(e).__name__}") from e
    ms = int((time.time() - t0) * 1000)
    _ledger(endpoint, units, r.status_code == 200, ms)
    if r.status_code != 200:
        log.warning("sarvam %s status=%s", endpoint, r.status_code)
        if r.status_code == 403:
            raise SarvamError("Sarvam API key is missing or invalid.")
        raise SarvamError(f"Sarvam {endpoint}: HTTP {r.status_code}")
    return r.json()


def _to_sarvam_lang(code: str | None) -> str:
    base = (code or "").split("-")[0].lower()
    if not base or base == "und":
        return "unknown"
    return {"or": "od-IN"}.get(base, f"{base}-IN")


def _from_sarvam_lang(code: str | None) -> str:
    base = (code or "").split("-")[0].lower()
    return {"od": "or"}.get(base, base) or "und"


def stt(audio: bytes, mime: str, language_hint: str | None = None) -> tuple[str, str]:
    """Voice note -> (transcript, MITRA language code). Audio is sent once and never stored."""
    s = get_settings()
    lang = langs.get(language_hint)
    mixed = bool(lang and lang.code.endswith("-Latn"))
    data = {
        "model": s.sarvam_stt_model,
        "language_code": _to_sarvam_lang(language_hint),
        "mode": "codemix" if mixed else "transcribe",
    }
    ext = {
        "audio/wav": "wav",
        "audio/x-wav": "wav",
        "audio/webm": "webm",
        "audio/ogg": "ogg",
        "audio/mpeg": "mp3",
        "audio/mp4": "mp4",
    }.get(mime, "wav")
    d = _post("/speech-to-text", len(audio) / 32000 / 60, files={"file": (f"note.{ext}", audio, mime)}, data=data)
    code = _from_sarvam_lang(d.get("language_code"))
    if mixed and lang:
        code = lang.code
    return str(d.get("transcript") or "").strip(), code


def _first_json(text: str) -> dict:
    start = text.find("{")
    if start < 0:
        raise ValueError("no JSON object")
    depth, in_str, esc = 0, False, False
    for i in range(start, len(text)):
        ch = text[i]
        if in_str:
            esc = (ch == "\\") and not esc
            if ch == '"' and not esc:
                in_str = False
            continue
        if ch == '"':
            in_str = True
        elif ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                return json.loads(text[start : i + 1])
    raise ValueError("unterminated JSON")


def _shape(schema: dict) -> str:
    """Compact description of a Gemini-style response schema for the prompt."""

    def walk(n: dict):
        t = n.get("type")
        if t == "OBJECT":
            return {k: walk(v) for k, v in n.get("properties", {}).items()}
        if t == "ARRAY":
            return [walk(n.get("items", {}))]
        if n.get("enum"):
            return "|".join(n["enum"])
        return {"STRING": "string", "INTEGER": "integer or null", "BOOLEAN": "true|false", "NUMBER": "number"}.get(t, "string")

    return json.dumps(walk(schema), ensure_ascii=False)


def generate(user_text: str, system: str, schema: dict | None = None, temperature: float = 0.1) -> str:
    """Chat completion. With a schema, returns a validated JSON string (one retry with the parse error)."""
    s = get_settings()
    sys_prompt = system
    if schema:
        sys_prompt += "\n\nReturn ONLY one JSON object, no prose, no code fence, exactly in this shape:\n" + _shape(schema)
    messages = [{"role": "system", "content": sys_prompt}, {"role": "user", "content": user_text}]
    for attempt in range(2):
        body = {
            "model": s.sarvam_chat_model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": 1200,
            "reasoning_effort": None,
        }  # reasoning off: 1 s and ~25x fewer tokens
        d = _post("/v1/chat/completions", 1, json=body)
        try:
            out = (d["choices"][0]["message"]["content"] or "").strip()
        except (KeyError, IndexError, TypeError) as e:
            raise SarvamError("Sarvam chat: empty response") from e
        if not out:
            raise SarvamError("Sarvam chat: empty response")
        if not schema:
            return out
        try:
            return json.dumps(_first_json(out), ensure_ascii=False)
        except ValueError as e:
            if attempt:
                raise SarvamError("Sarvam chat: invalid JSON") from e
            messages += [
                {"role": "assistant", "content": out[:1500]},
                {"role": "user", "content": f"That was not valid JSON ({e}). Reply again with ONLY the JSON object."},
            ]
    raise SarvamError("Sarvam chat: invalid JSON")


def tts(text: str, language: str | None = None) -> bytes:
    """Text -> WAV bytes (Bulbul). Cached by text + speaker. Raises for languages Bulbul doesn't speak."""
    s = get_settings()
    code = (langs.get(language) or langs.REGISTRY[langs.detect(text)]).code.split("-")[0]
    if code not in TTS_LANGS:
        raise SarvamError(f"Voice isn't available in {langs.REGISTRY.get(code, langs.REGISTRY['en']).english} yet.")
    text = text.strip()[:1500]
    key = hashlib.sha256(f"{s.sarvam_speaker}|{code}|{text}".encode()).hexdigest()
    if key in _tts_cache:
        return _tts_cache[key]
    d = _post(
        "/text-to-speech",
        len(text) / 1000,
        json={
            "text": text,
            "target_language_code": _to_sarvam_lang(code),
            "model": s.sarvam_tts_model,
            "speaker": s.sarvam_speaker,
        },
    )
    try:
        wav = base64.b64decode(d["audios"][0])
    except (KeyError, IndexError, ValueError) as e:
        raise SarvamError("Sarvam TTS: empty audio") from e
    if len(_tts_cache) < 200:
        _tts_cache[key] = wav
    return wav


def _parts_text(parts: list[dict]) -> str:
    return "\n".join(p["text"] for p in parts if "text" in p)


def usable_for(parts: list[dict]) -> bool:
    """Sarvam chat is text-only; image/audio parts go to another provider (or fail clearly)."""
    return enabled() and not any("inline_data" in p for p in parts)


def generate_parts(parts: list[dict], system: str, schema: dict | None, temperature: float) -> str:
    return generate(_parts_text(parts), system, schema, temperature)


_WS = re.compile(r"\s+")


def tidy(text: str) -> str:
    return _WS.sub(" ", text).strip()
