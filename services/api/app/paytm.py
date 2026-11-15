"""Paytm Payment Links adapter (staging by default), signed with Paytm's official `paytmchecksum` library.

Docs: https://www.paytmpayments.com/docs/api/create-link-api , /fetch-link-api , /fetch-transaction-link-api
Disabled unless MITRA_PAYTM_MID and MITRA_PAYTM_MERCHANT_KEY are set (never commit them; put them in services/api/.env).

MITRA_PAYTM_ENV=sandbox runs MITRA's own Paytm SANDBOX: the same request body, signed with the same official
library, but served by MITRA (pay page at /pay/<linkId>). No real money moves and every screen says so. It lets the
whole pre-order -> pay -> Soundbox announcement loop be shown without a live merchant ID.
"""

from __future__ import annotations

import json
import logging
import re
import time
from dataclasses import dataclass
from decimal import Decimal

import httpx

from .config import get_settings

log = logging.getLogger("mitra.paytm")

HOSTS = {"staging": "https://securestage.paytmpayments.com", "production": "https://secure.paytmpayments.com"}


class PaytmUnavailable(RuntimeError):
    pass


@dataclass
class PaymentLink:
    link_id: str
    short_url: str
    status: str
    raw_status: str


SANDBOX_KEY = "MITRASANDBOXKEY1"  # 16-byte demo key: signs sandbox requests only, protects nothing


def sandbox() -> bool:
    return get_settings().paytm_env == "sandbox"


def configured() -> bool:
    s = get_settings()
    return sandbox() or bool(s.paytm_mid and s.paytm_merchant_key)


def _signed(body: dict) -> dict:
    from paytmchecksum import PaytmChecksum  # imported lazily: optional dependency

    s = get_settings()
    payload = json.dumps(body, separators=(",", ":"))
    signature = PaytmChecksum.generateSignature(payload, s.paytm_merchant_key)
    return {"body": body, "head": {"tokenType": "AES", "signature": signature, "timestamp": str(int(time.time()))}}, payload


def _post(path: str, body: dict) -> dict:
    if not configured():
        raise PaytmUnavailable("Paytm is not connected. Add your staging MID and key in services/api/.env.")
    s = get_settings()
    envelope, payload = _signed(body)
    url = HOSTS.get(s.paytm_env, HOSTS["staging"]) + path
    try:
        # Paytm checks the signature against the exact body string, so send the same serialisation we signed.
        content = '{"body":' + payload + ',"head":' + json.dumps(envelope["head"], separators=(",", ":")) + "}"
        r = httpx.post(url, content=content, headers={"Content-Type": "application/json"}, timeout=20)
    except httpx.HTTPError as e:
        raise PaytmUnavailable(f"Could not reach Paytm ({type(e).__name__}).") from e
    try:
        data = r.json()
    except ValueError as e:
        raise PaytmUnavailable(f"Paytm returned HTTP {r.status_code}.") from e
    info = (data.get("body") or {}).get("resultInfo") or {}
    if r.status_code != 200 or info.get("resultStatus") not in ("SUCCESS", "S"):
        log.warning("paytm %s failed code=%s", path, info.get("resultCode"))
        raise PaytmUnavailable(
            f"Paytm: {info.get('resultMessage') or 'request failed'} ({info.get('resultCode', r.status_code)})"
        )
    return data["body"]


def create_link(
    *, amount: Decimal, name: str, description: str, order_ref: str, customer_name: str | None, customer_mobile: str | None
) -> PaymentLink:
    s = get_settings()
    body: dict = {
        "mid": s.paytm_mid,
        "linkType": "FIXED",
        # Paytm rejects special characters in names and limits descriptions to 3-30 chars
        "linkName": re.sub(r"[^A-Za-z0-9]", "", name)[:30] or "MITRA",
        "linkDescription": (re.sub(r"[^A-Za-z0-9 ]", " ", description).strip()[:30] or "MITRA preorder").ljust(3, "."),
        "amount": f"{amount:.2f}",
        "merchantRequestId": order_ref[:50],
        "linkOrderId": order_ref[:50],
        "partialPayment": False,
        "bindLinkIdMobile": False,
        "sendSms": bool(customer_mobile),
        "sendEmail": False,
        "maxPaymentsAllowed": 1,
        "singleTransactionOnly": True,
    }
    if customer_mobile:
        body["customerContact"] = {"customerName": (customer_name or "Customer")[:40], "customerMobile": customer_mobile}
    if sandbox():
        import secrets

        from paytmchecksum import PaytmChecksum

        body["mid"] = "MITRA_SANDBOX"
        payload = json.dumps(body, separators=(",", ":"))
        signature = PaytmChecksum.generateSignature(payload, SANDBOX_KEY)
        if not PaytmChecksum.verifySignature(payload, SANDBOX_KEY, signature):  # same check Paytm's server would do
            raise PaytmUnavailable("Sandbox signature check failed.")
        link_id = "SBX" + secrets.token_hex(10).upper()
        return PaymentLink(link_id=link_id, short_url=f"/pay/{link_id}", status="awaiting_payment", raw_status="SANDBOX")
    out = _post("/link/create", body)
    return PaymentLink(
        link_id=str(out.get("linkId")),
        short_url=out.get("shortUrl") or "",
        status="awaiting_payment",
        raw_status=str(out.get("status", "")),
    )


def fetch_paid(link_id: str) -> bool:
    """True when the link has at least one successful payment."""
    s = get_settings()
    out = _post("/link/fetchTransaction", {"mid": s.paytm_mid, "linkId": link_id})
    return any(str(o.get("orderStatus", "")).upper() in ("SUCCESS", "TXN_SUCCESS") for o in out.get("orders", []) or [])
