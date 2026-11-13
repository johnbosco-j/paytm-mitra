from datetime import UTC, date, datetime, timedelta
from decimal import Decimal
from types import SimpleNamespace

from conftest import new_client, signup

from app import insights as ins


def _sales(days=42, base=1000.0, weekend=1.5, start=date(2026, 11, 13)):
    out = []
    for i in range(days, 0, -1):
        d = start - timedelta(days=i)
        amt = base * (weekend if d.weekday() >= 5 else 1.0)
        out.append(
            SimpleNamespace(
                occurred_at=datetime(d.year, d.month, d.day, 6, tzinfo=UTC), amount=Decimal(str(amt)), payer_hash=None
            )
        )
    return out


def test_forecast_learns_weekday_rhythm():
    f = ins.forecast(_sales(), today=date(2026, 11, 13))
    assert f["status"] == "ok"
    sat = next(d for d in f["days"] if d["weekday"] == "Sat")
    wed = next(d for d in f["days"] if d["weekday"] == "Wed")
    assert sat["expected"] > wed["expected"] * 1.3
    assert f["backtest"]["mape_model"] < 2.0  # learns the weekly rhythm almost exactly


def test_forecast_abstains_without_data():
    assert ins.forecast(_sales(days=5), today=date(2026, 11, 13))["status"] == "insufficient_data"


def test_cash_runway_flags_rent_risk_and_needs_inputs():
    sales = _sales()
    rent = SimpleNamespace(next_due=datetime(2026, 11, 20, tzinfo=UTC), amount=Decimal("9000"), cadence="monthly")
    assert ins.cash_runway(sales, [rent], None, None, Decimal(0), today=date(2026, 11, 13))["status"] == "insufficient_data"
    risky = ins.cash_runway(sales, [rent], Decimal("1000"), Decimal("20"), Decimal(0), today=date(2026, 11, 13))
    safe = ins.cash_runway(sales, [rent], Decimal("50000"), Decimal("20"), Decimal(0), today=date(2026, 11, 13))
    assert risky["probability_shortfall"] > 0.9 and safe["probability_shortfall"] == 0
    assert risky["biggest_outflow"]["amount"] == 9000


def test_health_score_is_explainable_and_not_credit():
    h = ins.health_score(
        demand_days_14=10,
        trials_completed=2,
        trials_open_stale=0,
        sales_trend_pct=5.0,
        p_shortfall=0.1,
        at_risk_share=0.1,
        products_with_cost=5,
        products=5,
    )
    assert 0 <= h["score"] <= 100 and len(h["components"]) == 6
    assert "Not a credit score" in h["disclaimer"]


CSV = """Transaction Date,Order ID,Customer VPA,Transaction Amount,Status,Payment Mode
2026-11-01 10:15:00,ORD1,priya@okaxis,120.00,SUCCESS,UPI
2026-11-01 11:20:00,ORD2,ravi@ybl,45.50,SUCCESS,UPI
2026-11-02 18:05:00,ORD3,priya@okaxis,300,FAILED,UPI
2026-11-02 19:00:00,ORD4,,80,SUCCESS,Card
"""


def test_paytm_csv_import_hashes_payers_and_dedupes(owner_store):
    c, _ = owner_store
    files = {"file": ("statement.csv", CSV.encode(), "text/csv")}
    dry = c.post("/api/sales/import", files=files, data={"dry_run": "true"}).json()
    assert dry["imported"] == 3 and dry["skipped"] == 1 and dry["dry_run"]
    r = c.post("/api/sales/import", files={"file": ("statement.csv", CSV.encode(), "text/csv")}).json()
    assert r["imported"] == 3
    again = c.post("/api/sales/import", files={"file": ("statement.csv", CSV.encode(), "text/csv")}).json()
    assert again["imported"] == 0 and again["duplicates"] == 3
    summary = c.get("/api/sales/summary?days=60").json()
    assert summary["count"] == 3 and "paytm_csv" in summary["sources"]
    assert "priya" not in str(summary)


def test_sales_and_expenses_permissions(owner_store):
    owner, store_id = owner_store
    assert owner.post("/api/sales", json={"amount": "250", "method": "cash"}).status_code == 201
    due = (datetime.now(UTC) + timedelta(days=5)).isoformat()
    assert (
        owner.post("/api/expenses", json={"name": "Rent", "amount": "8000", "cadence": "monthly", "next_due": due}).status_code
        == 201
    )
    owner.post("/api/store/members", json={"name": "Ravi", "email": "s2@example.com", "password": "Kirana-Chennai-26"})
    staff = new_client()
    staff.post("/api/auth/login", json={"email": "s2@example.com", "password": "Kirana-Chennai-26"})
    staff.headers["X-Store-Id"] = store_id
    assert staff.post("/api/sales", json={"amount": "40"}).status_code == 201  # staff can record a sale
    assert staff.post("/api/expenses", json={"name": "X", "amount": "1", "cadence": "once", "next_due": due}).status_code == 403
    assert staff.post("/api/sales/import", files={"file": ("s.csv", CSV.encode(), "text/csv")}).status_code == 403
    other = new_client()
    signup(other, "o2@example.com")
    sid = other.post("/api/stores", json={"name": "Other"}).json()["id"]
    other.headers["X-Store-Id"] = sid
    assert other.get("/api/sales/summary").json()["count"] == 0
    assert other.get("/api/expenses").json() == []
