"""Soundbox autonomous listening and the Paytm sandbox pay loop. Sarvam is mocked: tests never spend credits."""

import json
from datetime import UTC, datetime, timedelta

from app import paytm, sarvam
from app.config import get_settings


def _mock_sarvam(monkeypatch, transcript, requests):
    monkeypatch.setattr(sarvam, "enabled", lambda: True)
    monkeypatch.setattr(sarvam, "stt", lambda audio, mime, hint=None: (transcript, "ta"))
    monkeypatch.setattr(
        sarvam, "generate",
        lambda user, system, schema=None, temperature=0.1: json.dumps({"transcript": transcript, "language": "ta", "english_gloss": "customer asked, shop said no", "requests": requests}),
    )


def _wav(n=20000):
    return {"audio": ("seg.wav", b"RIFF" + b"\0" * n, "audio/wav")}


def test_soundbox_logs_refused_item_without_a_tap_and_stores_no_transcript(owner_store, monkeypatch):
    c, _ = owner_store
    c.post("/api/products", json={"name": "Mango Lassi 200ml", "unit": "bottle", "cost_price": "22", "sell_price": "35", "shelf_life_days": 7})
    _mock_sarvam(monkeypatch, "anna mango lassi irukka illa ma", [
        {"raw_item": "mango lassi", "normalized_item": "mango lassi 200ml", "ask_count": 1, "ask_count_explicit": False, "reason": "not_stocked", "uncertainties": []},
        {"raw_item": "butter", "normalized_item": "amul butter", "ask_count": 1, "ask_count_explicit": False, "reason": "not_stocked", "uncertainties": []},
    ])
    r = c.post("/api/soundbox/hear", files=_wav())
    assert r.status_code == 200, r.text
    body = r.json()
    assert [x["item"] for x in body["logged"]] == ["Mango Lassi 200ml"]  # "butter" was never said: guard drops it
    assert body["say"]
    rows = c.get("/api/demand").json()
    row = next(x for x in rows["items"] if x["source_type"] == "soundbox_auto") if isinstance(rows, dict) else next(x for x in rows if x["source_type"] == "soundbox_auto")
    assert row["transcript"] in (None, "")
    # the same exchange arriving again within seconds is not double counted
    assert c.post("/api/soundbox/hear", files=_wav()).json()["logged"] == []


def test_soundbox_ignores_chatter_and_tiny_segments(owner_store, monkeypatch):
    c, _ = owner_store
    _mock_sarvam(monkeypatch, "vanakkam anna eppadi irukkinga", [])
    assert c.post("/api/soundbox/hear", files=_wav()).json()["logged"] == []
    assert c.post("/api/soundbox/hear", files=_wav(100)).json() == {"heard": False, "logged": [], "say": None}


def test_listening_needs_owner_and_a_displayed_notice(owner_store):
    c, _ = owner_store
    assert c.post("/api/soundbox/listening", json={"on": True}).status_code == 422
    assert c.post("/api/soundbox/listening", json={"on": True, "notice_displayed": True}).json() == {"on": True}


def test_paytm_sandbox_link_pay_and_soundbox_announcement(owner_store, monkeypatch):
    c, _ = owner_store
    monkeypatch.setattr(get_settings(), "paytm_env", "sandbox")
    assert paytm.sandbox() and paytm.configured()
    pre = c.post("/api/preorders", json={"item": "rose milk", "quantity": 2, "unit_price": "30", "customer_name": "Priya", "method": "paytm_link"})
    assert pre.status_code == 201, pre.text
    link = pre.json()["pay_url"]
    assert link.startswith("/pay/SBX")
    lid = link.split("/")[-1]
    info = c.get(f"/api/pay/{lid}").json()
    assert info["sandbox"] is True and info["amount"] == "60.00" and info["status"] == "awaiting_payment"
    since = (datetime.now(UTC) - timedelta(seconds=5)).isoformat()
    assert c.post(f"/api/pay/{lid}").json()["status"] == "paid"
    assert c.post(f"/api/pay/{lid}").json()["status"] == "paid"  # idempotent
    pay = c.get("/api/soundbox/feed", params={"since": since}).json()["payments"]
    assert len(pay) == 1 and pay[0]["amount"] == "60.00" and "60" in pay[0]["say"]
    assert c.get("/api/pay/SBXDOESNOTEXIST").status_code == 404
