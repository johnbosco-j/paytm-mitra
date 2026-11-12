"""Field-level encryption for customer PII (phone numbers). Fernet = AES-128-CBC + HMAC-SHA256."""

from __future__ import annotations

import base64
import hashlib
import logging

from cryptography.fernet import Fernet, InvalidToken

from .config import get_settings

log = logging.getLogger("mitra.crypto")
_warned = False


def _fernet() -> Fernet:
    global _warned
    s = get_settings()
    key = s.data_key
    if not key:
        # Dev fallback: derive from the JWT secret so local data stays readable. Production must set MITRA_DATA_KEY.
        if not _warned:
            log.warning("MITRA_DATA_KEY not set; deriving a dev key. Set it in any shared deployment.")
            _warned = True
        key = base64.urlsafe_b64encode(hashlib.sha256(("mitra-pii:" + s.jwt_secret).encode()).digest()).decode()
    return Fernet(key.encode())


def encrypt(value: str) -> str:
    return _fernet().encrypt(value.encode()).decode()


def decrypt(token: str) -> str | None:
    try:
        return _fernet().decrypt(token.encode()).decode()
    except (InvalidToken, ValueError):
        return None


def mask_phone(phone: str) -> str:
    digits = "".join(c for c in phone if c.isdigit())
    return ("•" * max(0, len(digits) - 4)) + digits[-4:]
