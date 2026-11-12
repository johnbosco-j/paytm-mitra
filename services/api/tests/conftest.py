import os

os.environ["MITRA_DATABASE_URL"] = "sqlite://"
os.environ["MITRA_AUTO_CREATE_SCHEMA"] = "true"
os.environ["MITRA_AI_PROVIDER"] = "none"  # tests never call a live model
os.environ["MITRA_LOCAL_MODEL_URL"] = "http://127.0.0.1:9"  # no offline model in tests

import pytest
from fastapi.testclient import TestClient

from app.db import Base, engine
from app.main import app


@pytest.fixture()
def client():
    from app.hardening import login_limiter, signup_limiter

    login_limiter.reset()
    signup_limiter.reset()
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    with TestClient(app) as c:
        yield c


def signup(client: TestClient, email: str, name: str = "Owner") -> TestClient:
    r = client.post("/api/auth/signup", json={"name": name, "email": email, "password": "Kirana-Chennai-26"})
    assert r.status_code == 201, r.text
    return client


def new_client() -> TestClient:
    return TestClient(app)


@pytest.fixture()
def owner_store(client):
    signup(client, "owner@example.com")
    s = client.post("/api/stores", json={"name": "Murugan Stores", "city": "Chennai"}).json()
    client.headers["X-Store-Id"] = s["id"]
    return client, s["id"]
