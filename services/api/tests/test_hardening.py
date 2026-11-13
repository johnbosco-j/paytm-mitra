from conftest import new_client, signup

from app.hardening import login_limiter, signup_limiter


def setup_function():
    login_limiter.reset()
    signup_limiter.reset()


def test_common_password_rejected(client):
    r = client.post("/api/auth/signup", json={"name": "A", "email": "a@example.com", "password": "password123"})
    assert r.status_code == 422


def test_lockout_after_failed_logins(client):
    signup(client, "lock@example.com")
    c = new_client()
    for _ in range(6):
        assert c.post("/api/auth/login", json={"email": "lock@example.com", "password": "wrong-pass-1"}).status_code == 401
    r = c.post("/api/auth/login", json={"email": "lock@example.com", "password": "Kirana-Chennai-26"})
    assert r.status_code == 423 and r.json()["code"] == "ACCOUNT_LOCKED"


def test_rate_limit(client):
    c = new_client()
    codes = [c.post("/api/auth/login", json={"email": "nobody@example.com", "password": "x"}).status_code for _ in range(10)]
    assert 429 in codes


def test_logout_all_revokes_sessions(client):
    signup(client, "rev@example.com")
    other = new_client()
    other.post("/api/auth/login", json={"email": "rev@example.com", "password": "Kirana-Chennai-26"})
    assert other.get("/api/me").status_code == 200
    assert client.post("/api/auth/logout-all").status_code == 200
    assert other.get("/api/me").status_code == 401


def test_cross_origin_post_blocked(client):
    r = client.post(
        "/api/auth/login", json={"email": "x@example.com", "password": "y"}, headers={"Origin": "https://evil.example"}
    )
    assert r.status_code == 403 and r.json()["code"] == "BAD_ORIGIN"


def test_security_headers(client):
    h = client.get("/api/health").headers
    assert h["x-frame-options"] == "DENY" and h["x-content-type-options"] == "nosniff"


def test_preorder_upi_and_pii(owner_store):
    c, _ = owner_store
    c.post("/api/products", json={"name": "Mango Lassi", "cost_price": "22", "sell_price": "35"})
    body = {"item": "mango lassi", "quantity": 2, "customer_name": "Priya", "phone": "+91 98400 12345", "method": "upi_qr"}
    assert c.post("/api/preorders", json=body).status_code == 422  # no consent
    body["consent_contact"] = True
    assert c.post("/api/preorders", json=body).json()["code"] == "UPI_NOT_SET"
    assert c.patch("/api/store", json={"upi_vpa": "naren@okaxis"}).status_code == 200
    p = c.post("/api/preorders", json=body).json()
    assert p["amount"] == "70.00" and p["phone"] == "••••••2345" and p["pay_url"].startswith("upi://pay?pa=naren%40okaxis")
    assert "9840012345" not in str(c.get("/api/preorders").json())  # never returned in lists
    assert c.get(f"/api/preorders/{p['id']}/contact").json()["phone"] == "9840012345"  # owner reveal, audited
    assert c.post(f"/api/preorders/{p['id']}/status", json={"status": "paid"}).json()["status"] == "paid"
    assert c.post(f"/api/preorders/{p['id']}/status", json={"status": "fulfilled"}).json()["code"] == "NEGATIVE_STOCK"


def test_paytm_link_requires_credentials(owner_store):
    c, _ = owner_store
    c.post("/api/products", json={"name": "Rose Milk", "cost_price": "18", "sell_price": "30"})
    r = c.post("/api/preorders", json={"item": "rose milk", "quantity": 1, "customer_name": "Ravi", "method": "paytm_link"})
    assert r.status_code == 503 and r.json()["code"] == "PAYTM_UNAVAILABLE"
