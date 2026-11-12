"""HTTP hardening: security headers, same-origin check on state-changing requests, auth rate limiting."""

from __future__ import annotations

import time
from collections import defaultdict, deque
from urllib.parse import urlparse

from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from .config import get_settings

SAFE = {"GET", "HEAD", "OPTIONS"}


class SecurityHeaders(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        resp = await call_next(request)
        resp.headers.setdefault("X-Content-Type-Options", "nosniff")
        resp.headers.setdefault("X-Frame-Options", "DENY")
        resp.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
        resp.headers.setdefault("Permissions-Policy", "microphone=(self), camera=(), geolocation=()")
        resp.headers.setdefault("Cache-Control", "no-store")
        if get_settings().cookie_secure:
            resp.headers.setdefault("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
        return resp


class OriginGuard(BaseHTTPMiddleware):
    """CSRF defence in depth (cookies are SameSite=Lax too): unsafe methods must come from an allowed origin."""

    async def dispatch(self, request: Request, call_next):
        if request.method not in SAFE:
            origin = request.headers.get("origin") or request.headers.get("referer")
            if origin:
                host = urlparse(origin).netloc
                allowed = {urlparse(o.strip()).netloc for o in get_settings().cors_origins.split(",")}
                allowed.add(request.headers.get("host", ""))
                allowed.add(request.headers.get("x-forwarded-host", ""))
                if host not in allowed:
                    return JSONResponse(status_code=403, content={"code": "BAD_ORIGIN", "message": "Request blocked: unexpected origin."})
        return await call_next(request)


class RateLimiter:
    """Sliding-window limiter (in-process). Good for one instance; use Redis for several."""

    def __init__(self, limit: int, window_s: int):
        self.limit, self.window = limit, window_s
        self.hits: dict[str, deque[float]] = defaultdict(deque)

    def allow(self, key: str) -> bool:
        now = time.monotonic()
        q = self.hits[key]
        while q and now - q[0] > self.window:
            q.popleft()
        if len(q) >= self.limit:
            return False
        q.append(now)
        return True

    def reset(self) -> None:
        self.hits.clear()


login_limiter = RateLimiter(limit=8, window_s=60)
signup_limiter = RateLimiter(limit=5, window_s=600)
ai_limiter = RateLimiter(limit=40, window_s=60)

COMMON_PASSWORDS = {"password", "password1", "password123", "12345678", "123456789", "qwerty123", "iloveyou", "admin123",
                    "welcome1", "paytm123", "11111111", "abc12345"}


def client_ip(request: Request) -> str:
    fwd = request.headers.get("x-forwarded-for")
    return (fwd.split(",")[0].strip() if fwd else (request.client.host if request.client else "unknown"))
