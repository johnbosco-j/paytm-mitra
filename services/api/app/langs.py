"""India's 22 scheduled languages + English + common code-mixed forms, with script-based detection.

Registry and detector adapted from the team's own Nijam.AI project (packages/engine/nijam_engine/langs.py).
Support flags describe what MITRA can do per language today, honestly:
  cloud      - Gemini can transcribe speech and read typed notes in this language
  offline_stt- the on-device Whisper large-v3-turbo model has this language
  offline_llm- MITRA-Lite (our fine-tune) was trained on it; other languages fall back to cloud or are flagged
"""

from __future__ import annotations

import re
import unicodedata
from dataclasses import asdict, dataclass

# Whisper large-v3 language list (checked against mlx_whisper.tokenizer.LANGUAGES)
_WHISPER = {"as", "bn", "gu", "hi", "kn", "ml", "mr", "ne", "pa", "sa", "sd", "ta", "te", "ur", "en"}
_LITE = {"ta", "ta-Latn", "en"}


@dataclass(frozen=True)
class Language:
    code: str
    name: str  # endonym
    english: str
    script: str
    scheduled: bool  # one of the 22 languages in the Eighth Schedule

    def support(self) -> dict:
        base = self.code.split("-")[0]
        return {**asdict(self), "cloud": True, "offline_stt": base in _WHISPER, "offline_llm": self.code in _LITE}


LANGUAGES: list[Language] = [
    Language("ta", "தமிழ்", "Tamil", "Taml", True),
    Language("te", "తెలుగు", "Telugu", "Telu", True),
    Language("kn", "ಕನ್ನಡ", "Kannada", "Knda", True),
    Language("ml", "മലയാളം", "Malayalam", "Mlym", True),
    Language("hi", "हिन्दी", "Hindi", "Deva", True),
    Language("bn", "বাংলা", "Bengali", "Beng", True),
    Language("mr", "मराठी", "Marathi", "Deva", True),
    Language("gu", "ગુજરાતી", "Gujarati", "Gujr", True),
    Language("pa", "ਪੰਜਾਬੀ", "Punjabi", "Guru", True),
    Language("or", "ଓଡ଼ିଆ", "Odia", "Orya", True),
    Language("as", "অসমীয়া", "Assamese", "Beng", True),
    Language("ur", "اردو", "Urdu", "Arab", True),
    Language("kok", "कोंकणी", "Konkani", "Deva", True),
    Language("mai", "मैथिली", "Maithili", "Deva", True),
    Language("ne", "नेपाली", "Nepali", "Deva", True),
    Language("sa", "संस्कृतम्", "Sanskrit", "Deva", True),
    Language("sd", "سنڌي", "Sindhi", "Arab", True),
    Language("ks", "کٲشُر", "Kashmiri", "Arab", True),
    Language("doi", "डोगरी", "Dogri", "Deva", True),
    Language("brx", "बड़ो", "Bodo", "Deva", True),
    Language("mni", "ꯃꯩꯇꯩꯂꯣꯟ", "Manipuri (Meitei)", "Mtei", True),
    Language("sat", "ᱥᱟᱱᱛᱟᱲᱤ", "Santali", "Olck", True),
    Language("en", "English", "English", "Latn", False),
    Language("ta-Latn", "Tanglish", "Tamil in Latin script", "Latn", False),
    Language("hi-Latn", "Hinglish", "Hindi in Latin script", "Latn", False),
    Language("te-Latn", "Tenglish", "Telugu in Latin script", "Latn", False),
    Language("ml-Latn", "Manglish", "Malayalam in Latin script", "Latn", False),
    Language("kn-Latn", "Kanglish", "Kannada in Latin script", "Latn", False),
]
REGISTRY = {lang.code: lang for lang in LANGUAGES}
CODES = frozenset(REGISTRY)
assert sum(lang.scheduled for lang in LANGUAGES) == 22


def get(code: str | None) -> Language | None:
    if not code:
        return None
    if code in REGISTRY:
        return REGISTRY[code]
    c = code.replace("_", "-")
    base = c.split("-")[0].lower()
    if c.lower().endswith("-latn") and f"{base}-Latn" in REGISTRY:
        return REGISTRY[f"{base}-Latn"]
    if c.lower() in {"ta-en", "tanglish"}:
        return REGISTRY["ta-Latn"]
    if c.lower() in {"hi-en", "hinglish"}:
        return REGISTRY["hi-Latn"]
    return REGISTRY.get(base)


def describe(code: str | None) -> str:
    """Human description for prompts, e.g. 'Bengali (বাংলা, Bengali script)'."""
    lang = get(code) or REGISTRY["en"]
    if lang.code.endswith("-Latn"):
        return f"{lang.english} (code-mixed, Latin letters)"
    return f"{lang.english} ({lang.name}, {lang.script} script)" if lang.code != "en" else "simple Indian English"


_SCRIPTS = (
    ("Taml", 0x0B80, 0x0BFF),
    ("Telu", 0x0C00, 0x0C7F),
    ("Knda", 0x0C80, 0x0CFF),
    ("Mlym", 0x0D00, 0x0D7F),
    ("Deva", 0x0900, 0x097F),
    ("Beng", 0x0980, 0x09FF),
    ("Guru", 0x0A00, 0x0A7F),
    ("Gujr", 0x0A80, 0x0AFF),
    ("Orya", 0x0B00, 0x0B7F),
    ("Arab", 0x0600, 0x06FF),
    ("Olck", 0x1C50, 0x1C7F),
    ("Mtei", 0xABC0, 0xABFF),
)
_SCRIPT_LANG = {
    "Taml": "ta",
    "Telu": "te",
    "Knda": "kn",
    "Mlym": "ml",
    "Deva": "hi",
    "Beng": "bn",
    "Guru": "pa",
    "Gujr": "gu",
    "Orya": "or",
    "Arab": "ur",
    "Olck": "sat",
    "Mtei": "mni",
}


def dominant_script(text: str) -> str:
    counts: dict[str, int] = {}
    for ch in text:
        cp = ord(ch)
        if ch.isascii():
            if ch.isalpha():
                counts["Latn"] = counts.get("Latn", 0) + 1
            continue
        for name, lo, hi in _SCRIPTS:
            if lo <= cp <= hi:
                counts[name] = counts.get(name, 0) + 1
                break
        else:
            if unicodedata.category(ch).startswith("L"):
                counts["Latn"] = counts.get("Latn", 0) + 1
    return max(counts, key=counts.get) if counts else "Zyyy"


def _words(text: str) -> list[str]:
    return [w for w in re.split(r"[\s.,!?;:'\"()\[\]{}<>/\\|@#*+=~`^%&₹$€\-–—…।॥0-9]+", text.lower()) if w]


_LATIN_MARKERS = {
    "ta-Latn": {
        "pannunga",
        "unga",
        "irukku",
        "irukka",
        "illa",
        "illai",
        "enna",
        "romba",
        "naan",
        "venum",
        "vendam",
        "ketanga",
        "kettanga",
        "kettaanga",
        "per",
        "peru",
        "innaiku",
        "inniku",
        "sonnen",
        "pochu",
        "theernthu",
        "anna",
        "kudunga",
        "thaan",
    },
    "hi-Latn": {
        "hai",
        "nahi",
        "nahin",
        "kya",
        "aap",
        "bhai",
        "mangta",
        "maanga",
        "chahiye",
        "log",
        "logon",
        "aaj",
        "tha",
        "thi",
        "mein",
        "hain",
        "kar",
        "khatam",
        "milega",
        "diya",
        "bola",
        "puchha",
        "poocha",
    },
    "te-Latn": {"ledu", "undi", "andi", "emi", "garu", "kavali", "adigaru", "adigindi", "ivvandi", "ippudu", "enti", "ela"},
    "ml-Latn": {"njan", "ningal", "aanu", "alle", "venam", "chodichu", "chettan", "chechi", "illallo", "undo", "kittiyilla"},
    "kn-Latn": {"maadi", "nimma", "beku", "kodi", "illa", "kelidru", "sigalilla", "kelidaru", "ide", "illva"},
    "en": {"the", "asked", "for", "customers", "people", "today", "out", "of", "stock", "we", "dont", "have", "wanted"},
}
_DEVA_MARKERS = {
    "mr": {"आहे", "नाही", "होते", "विचारले", "मागितले", "संपले"},
    "ne": {"छ", "छैन", "हुन्छ", "सकियो", "मागे"},
    "mai": {"छल", "अछि", "नहि", "मंगलक"},
    "kok": {"आसा", "ना", "जाल्लें", "मागलें"},
}


def detect(text: str) -> str:
    """Best-effort language code for a note. Script decides most cases; Latin text uses marker words."""
    script = dominant_script(text)
    words = _words(text)
    if script == "Latn":
        scores = {code: sum(w in marks for w in words) for code, marks in _LATIN_MARKERS.items()}
        mix = {k: v for k, v in scores.items() if k.endswith("-Latn")}
        best_mix = max(mix, key=mix.get)
        if mix[best_mix] >= 2 or (mix[best_mix] >= 1 and scores["en"] == 0):
            return best_mix
        return "en"
    if script == "Deva":
        for code, marks in _DEVA_MARKERS.items():
            if any(w in marks for w in words):
                return code
    if script == "Beng" and re.search("[ৰৱ]", text):
        return "as"
    if script == "Arab":
        if re.search("[ڄڃڳڻ]", text):
            return "sd"
        if re.search("[ٲٳۄۆ]", text):
            return "ks"
    return _SCRIPT_LANG.get(script, "en")
