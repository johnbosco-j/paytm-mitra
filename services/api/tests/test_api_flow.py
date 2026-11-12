from datetime import UTC, datetime, timedelta

from conftest import new_client, signup

from app.ai import rule_based_extract


def _seed_lassi_demand(c, total=24, days=6):
    now = datetime.now(UTC)
    per = total // days
    for d in range(days):
        n = per + (total - per * days if d == 0 else 0)
        r = c.post(
            "/api/demand",
            json={
                "items": [{"raw_item": "mango lassi", "ask_count": n}],
                "requested_at": (now - timedelta(days=d, hours=1)).isoformat(),
            },
        )
        assert r.status_code == 201, r.text


def test_full_leap_loop(owner_store):
    c, _store_id = owner_store
    _seed_lassi_demand(c)

    # No cost yet -> MITRA refuses to estimate profit.
    opp = c.get("/api/opportunities").json()["items"][0]
    assert opp["item"] == "mango lassi" and opp["evidence"]["ask_total"] == 24
    assert opp["status"] == "needs_cost" and opp["scenarios"] == []
    assert c.post("/api/trials", json={"item": "mango lassi", "quantity": 16}).status_code == 422

    # Owner adds cost/price -> ready opportunity with 16-unit proposal.
    p = c.post(
        "/api/products",
        json={
            "name": "Mango Lassi",
            "aliases": ["mango lassi 200ml"],
            "unit": "bottle",
            "cost_price": "22",
            "sell_price": "35",
            "shelf_life_days": 5,
        },
    )
    assert p.status_code == 201, p.text
    opp = c.get("/api/opportunities").json()["items"][0]
    assert opp["status"] == "ready" and opp["proposal"]["quantity"] == 16
    assert [s["units_sold"] for s in opp["scenarios"]] == [8, 12, 16]

    t = c.post("/api/trials", json={"item": "mango lassi", "quantity": 16}).json()
    assert t["status"] == "pending_approval" and t["planned_outlay"] == "352.00"
    assert c.post("/api/trials", json={"item": "mango lassi", "quantity": 16}).status_code == 409  # one open trial

    # Cannot receive before approval; supplier message requires approval.
    assert c.post(f"/api/trials/{t['id']}/receive", json={"received_qty": 16}).status_code == 409
    assert c.post(f"/api/trials/{t['id']}/supplier-message", json={"language": "en"}).status_code == 409

    a = c.post(f"/api/trials/{t['id']}/approve", json={"note": "try it"})
    assert a.status_code == 200 and a.json()["status"] == "approved"
    msg = c.post(f"/api/trials/{t['id']}/supplier-message", json={"language": "en"}).json()
    assert msg["sent"] is False and "16" in msg["text"]

    assert c.post(f"/api/trials/{t['id']}/receive", json={"received_qty": 16}).json()["status"] == "active"
    out = c.post(f"/api/trials/{t['id']}/outcome", json={"sold_qty": 14, "wasted_qty": 0}, headers={"Idempotency-Key": "abc-1"})
    assert out.status_code == 200, out.text
    res = out.json()["result"]
    assert res["revenue"] == "490.00" and res["cogs"] == "308.00" and res["gross_profit"] == "182.00"
    assert res["cash_difference"] == "138.00" and res["leftover_value"] == "44.00"

    # Replaying the same submit does not double-book stock.
    again = c.post(f"/api/trials/{t['id']}/outcome", json={"sold_qty": 14, "wasted_qty": 0}, headers={"Idempotency-Key": "abc-1"})
    assert again.status_code == 200
    prod = next(x for x in c.get("/api/products").json() if x["name"] == "Mango Lassi")
    assert prod["stock_qty"] == 2

    dash = c.get("/api/dashboard").json()
    assert dash["kpis"]["realized_gross_profit"] == "182.00" and dash["kpis"]["asks_7d"] == 24
    actions = [e["action"] for e in c.get("/api/activity").json()]
    for needed in [
        "demand.confirmed",
        "product.created",
        "trial.proposed",
        "trial.approved",
        "trial.received",
        "trial.completed",
    ]:
        assert needed in actions


def test_staff_cannot_approve_or_change_prices(owner_store):
    owner, store_id = owner_store
    _seed_lassi_demand(owner)
    owner.post("/api/products", json={"name": "Mango Lassi", "cost_price": "22", "sell_price": "35"})
    r = owner.post("/api/store/members", json={"name": "Ravi", "email": "staff@example.com", "password": "Kirana-Chennai-26"})
    assert r.status_code == 201

    staff = new_client()
    assert staff.post("/api/auth/login", json={"email": "staff@example.com", "password": "Kirana-Chennai-26"}).status_code == 200
    staff.headers["X-Store-Id"] = store_id
    # Staff can log demand and propose...
    assert staff.post("/api/demand", json={"items": [{"raw_item": "rose milk", "ask_count": 2}]}).status_code == 201
    t = staff.post("/api/trials", json={"item": "mango lassi", "quantity": 16})
    assert t.status_code == 201
    # ...but cannot approve spending or edit prices.
    deny = staff.post(f"/api/trials/{t.json()['id']}/approve", json={})
    assert deny.status_code == 403 and deny.json()["code"] == "OWNER_APPROVAL_REQUIRED"
    assert staff.post("/api/products", json={"name": "X", "cost_price": "1", "sell_price": "2"}).status_code == 403
    assert owner.get(f"/api/trials/{t.json()['id']}").json()["status"] == "pending_approval"


def test_tenant_isolation(owner_store):
    a, store_a = owner_store
    a.post("/api/demand", json={"items": [{"raw_item": "paneer", "ask_count": 3}]})
    pid = a.post("/api/products", json={"name": "Paneer", "cost_price": "60", "sell_price": "80"}).json()["id"]

    b = new_client()
    signup(b, "other@example.com", "Other")
    store_b = b.post("/api/stores", json={"name": "Other Shop"}).json()["id"]
    b.headers["X-Store-Id"] = store_b
    assert b.get("/api/demand").json() == []
    assert b.get("/api/products").json() == []
    # Forged store header and foreign IDs are refused.
    b.headers["X-Store-Id"] = store_a
    assert b.get("/api/products").status_code == 403
    b.headers["X-Store-Id"] = store_b
    assert b.patch(f"/api/products/{pid}", json={"sell_price": "1"}).status_code == 404
    assert b.post(f"/api/products/{pid}/adjust", json={"qty_delta": 5}).status_code == 404


def test_unauthenticated_and_validation(client):
    assert client.get("/api/me").status_code == 401
    signup(client, "v@example.com")
    sid = client.post("/api/stores", json={"name": "Shop"}).json()["id"]
    client.headers["X-Store-Id"] = sid
    bad = client.post("/api/demand", json={"items": [{"raw_item": "milk", "ask_count": 0}]})
    assert bad.status_code == 422 and bad.json()["code"] == "INVALID_INPUT"
    neg = client.post("/api/products", json={"name": "Milk", "cost_price": "-1"})
    assert neg.status_code == 422


def test_demand_idempotency(owner_store):
    c, _ = owner_store
    body = {"items": [{"raw_item": "rose milk", "ask_count": 4}]}
    r1 = c.post("/api/demand", json=body, headers={"Idempotency-Key": "k1"})
    r2 = c.post("/api/demand", json=body, headers={"Idempotency-Key": "k1"})
    assert r1.json() == r2.json()
    assert len(c.get("/api/demand").json()) == 1


def test_extract_without_ai_uses_reviewable_fallback(owner_store):
    c, _ = owner_store
    r = c.post("/api/demand/extract", data={"text": "5 customers asked for mango lassi, 2 people wanted rose milk"})
    assert r.status_code == 200
    body = r.json()
    assert body["extractor"] == "rules-v1" and body["warning"]
    items = {x["normalized_item"]: x["ask_count"] for x in body["requests"]}
    assert items == {"mango lassi": 5, "rose milk": 2}
    assert all(x["requires_review"] for x in body["requests"])
    assert c.get("/api/demand").json() == []  # extraction never saves


def test_rule_extractor_never_guesses_count():
    res = rule_based_extract("customers asked for filter coffee powder")
    assert res.requests[0]["ask_count"] is None
    assert "count not mentioned" in res.requests[0]["uncertainties"]
