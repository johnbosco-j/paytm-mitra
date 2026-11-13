"""Deterministic insight engines on the store's own records (no LLM, no external data).

- forecast: 7-day revenue forecast = weekday profile x recent level, backtested against a naive "same day last week" baseline.
- cash runway: Monte Carlo (seeded) of the next 30 days using bootstrapped real daily sales, the owner's margin, scheduled
  expenses and open trial commitments. Shows risk; never a lending decision.
- customers: recency/frequency on pseudonymous payers (repeat-visit segments).
- health: an explainable 0-100 business-habits score. Explicitly NOT a credit score.
"""

from __future__ import annotations

import random
import statistics
from collections import defaultdict
from datetime import UTC, date, datetime, timedelta, timezone
from decimal import Decimal

IST = timezone(timedelta(hours=5, minutes=30))
FESTIVALS = [  # Tamil Nadu retail moments (dates approximate; owners should confirm locally)
    (date(2026, 12, 25), "Christmas"),
    (date(2027, 1, 1), "New Year"),
    (date(2027, 1, 14), "Bhogi"),
    (date(2027, 1, 15), "Thai Pongal"),
    (date(2027, 1, 16), "Mattu Pongal"),
    (date(2027, 1, 26), "Republic Day"),
    (date(2027, 4, 14), "Tamil New Year"),
]


def _ist_day(dt: datetime) -> date:
    return (dt if dt.tzinfo else dt.replace(tzinfo=UTC)).astimezone(IST).date()


def daily_totals(sales: list, days: int, today: date) -> list[tuple[date, float]]:
    by = defaultdict(float)
    for s in sales:
        by[_ist_day(s.occurred_at)] += float(s.amount)
    return [(today - timedelta(days=i), by.get(today - timedelta(days=i), 0.0)) for i in range(days, 0, -1)]


def _model(history: list[tuple[date, float]], target: date) -> float:
    """Weekday profile x recent level (last 14 days), from history strictly before `target`."""
    hist = [(d, v) for d, v in history if d < target]
    if len(hist) < 14:
        return hist[-7][1] if len(hist) >= 7 else (statistics.fmean(v for _, v in hist) if hist else 0.0)
    level = statistics.fmean(v for _, v in hist[-14:])
    by_wd = defaultdict(list)
    for d, v in hist[-56:]:
        by_wd[d.weekday()].append(v)
    overall = statistics.fmean(v for _, v in hist[-56:]) or 1.0
    factor = (statistics.fmean(by_wd[target.weekday()]) / overall) if by_wd[target.weekday()] else 1.0
    return max(0.0, level * factor)


def forecast(sales: list, today: date | None = None) -> dict:
    today = today or datetime.now(IST).date()
    hist = daily_totals(sales, 70, today)
    first = next((i for i, (_, v) in enumerate(hist) if v > 0), len(hist))
    hist = hist[first:]  # days before the first recorded sale are "no data", not zero sales
    active = sum(1 for _, v in hist if v > 0)
    if active < 14:
        return {
            "status": "insufficient_data",
            "message": "Record at least 2 weeks of sales (or import your Paytm statement) to forecast.",
            "days_with_sales": active,
        }
    # backtest the last 14 days: model vs naive same-weekday-last-week
    errs_m, errs_n = [], []
    for i in range(14, 0, -1):
        d = today - timedelta(days=i)
        actual = dict(hist)[d]
        if actual <= 0:
            continue
        errs_m.append(abs(_model(hist, d) - actual) / actual)
        errs_n.append(abs(dict(hist).get(d - timedelta(days=7), 0.0) - actual) / actual)
    mape_m = round(100 * statistics.fmean(errs_m), 1) if errs_m else None
    mape_n = round(100 * statistics.fmean(errs_n), 1) if errs_n else None
    resid = [abs(e) for e in errs_m] or [0.2]
    spread = sorted(resid)[int(0.8 * (len(resid) - 1))]
    days = []
    ext = list(hist)
    for i in range(7):
        d = today + timedelta(days=i)
        y = _model(ext, d)
        ext.append((d, y))
        fest = next((n for fd, n in FESTIVALS if fd == d), None)
        days.append(
            {
                "date": d.isoformat(),
                "weekday": d.strftime("%a"),
                "expected": round(y),
                "low": round(y * (1 - spread)),
                "high": round(y * (1 + spread)),
                "festival": fest,
            }
        )
    upcoming = [
        {"date": fd.isoformat(), "name": n, "in_days": (fd - today).days} for fd, n in FESTIVALS if 0 <= (fd - today).days <= 45
    ]
    last7 = sum(v for _, v in hist[-7:])
    prev7 = sum(v for _, v in hist[-14:-7])
    return {
        "status": "ok",
        "method": "weekday profile x 14-day level",
        "days": days,
        "week_total": round(sum(x["expected"] for x in days)),
        "backtest": {
            "days": len(errs_m),
            "mape_model": mape_m,
            "mape_naive": mape_n,
            "beats_naive": (mape_m is not None and mape_n is not None and mape_m < mape_n),
        },
        "last7": round(last7),
        "prev7": round(prev7),
        "trend_pct": round(100 * (last7 - prev7) / prev7, 1) if prev7 else None,
        "upcoming_festivals": upcoming,
    }


def _occurrences(exp, start: date, horizon: int) -> list[date]:
    d = _ist_day(exp.next_due)
    out = []
    while d < start + timedelta(days=horizon):
        if d >= start:
            out.append(d)
        if exp.cadence == "weekly":
            d += timedelta(days=7)
        elif exp.cadence == "monthly":
            m = d.month % 12 + 1
            y = d.year + (1 if m == 1 else 0)
            d = date(y, m, min(d.day, 28))
        else:
            break
    return out


def cash_runway(
    sales: list,
    expenses: list,
    cash: Decimal | None,
    margin_pct: Decimal | None,
    commitments: Decimal,
    today: date | None = None,
    horizon: int = 30,
    runs: int = 2000,
    seed: int = 7,
) -> dict:
    today = today or datetime.now(IST).date()
    missing = [k for k, v in (("cash on hand", cash), ("average margin %", margin_pct)) if v is None]
    hist = daily_totals(sales, 56, today)
    if missing or sum(1 for _, v in hist if v > 0) < 14:
        return {
            "status": "insufficient_data",
            "missing": missing,
            "message": "Add cash on hand and your average margin in Settings, and at least 2 weeks of sales.",
        }
    by_wd = defaultdict(list)
    for d, v in hist:
        by_wd[d.weekday()].append(v)
    m = float(margin_pct) / 100
    out_by_day = defaultdict(float)
    for e in expenses:
        for d in _occurrences(e, today, horizon):
            out_by_day[(d - today).days] += float(e.amount)
    out_by_day[0] += float(commitments)  # approved trial purchases not yet paid
    rng = random.Random(seed)
    mins, ends, fail_day = [], [], []
    paths = [[0.0] * horizon for _ in range(3)]
    finals = []
    for _ in range(runs):
        bal = float(cash)
        lo, first_neg = bal, None
        path = []
        for i in range(horizon):
            wd = (today + timedelta(days=i)).weekday()
            sale = rng.choice(by_wd[wd]) if by_wd[wd] else 0.0
            bal += sale * m - out_by_day.get(i, 0.0)
            path.append(bal)
            lo = min(lo, bal)
            if bal < 0 and first_neg is None:
                first_neg = i
        mins.append(lo)
        ends.append(bal)
        fail_day.append(first_neg)
        finals.append(path)
    # percentile bands per day
    for i in range(horizon):
        col = sorted(p[i] for p in finals)
        paths[0][i] = col[int(0.1 * (runs - 1))]
        paths[1][i] = col[int(0.5 * (runs - 1))]
        paths[2][i] = col[int(0.9 * (runs - 1))]
    p_short = sum(1 for d in fail_day if d is not None) / runs
    first_days = sorted(d for d in fail_day if d is not None)
    worst = max(out_by_day.items(), key=lambda kv: kv[1], default=(None, 0))
    return {
        "status": "ok",
        "horizon_days": horizon,
        "runs": runs,
        "probability_shortfall": round(p_short, 3),
        "earliest_risk_date": (today + timedelta(days=first_days[len(first_days) // 2])).isoformat() if first_days else None,
        "expected_end": round(statistics.median(ends)),
        "p10_min": round(sorted(mins)[int(0.1 * (runs - 1))]),
        "band": [
            {
                "date": (today + timedelta(days=i)).isoformat(),
                "p10": round(paths[0][i]),
                "p50": round(paths[1][i]),
                "p90": round(paths[2][i]),
            }
            for i in range(horizon)
        ],
        "biggest_outflow": {"date": (today + timedelta(days=worst[0])).isoformat(), "amount": round(worst[1])}
        if worst[0] is not None
        else None,
        "assumptions": {
            "cash_on_hand": str(cash),
            "margin_pct": str(margin_pct),
            "commitments": str(commitments),
            "sales_basis": "bootstrapped from your last 8 weeks, by weekday",
        },
    }


def customer_segments(sales: list, today: date | None = None) -> dict:
    today = today or datetime.now(IST).date()
    visits = defaultdict(list)
    spend = defaultdict(float)
    for s in sales:
        if s.payer_hash:
            visits[s.payer_hash].append(_ist_day(s.occurred_at))
            spend[s.payer_hash] += float(s.amount)
    if len(visits) < 5:
        return {"status": "insufficient_data", "message": "Import a Paytm statement with payer details to see repeat customers."}
    seg = {"regular": [], "at_risk": [], "lost": [], "new": [], "occasional": []}
    for pid, ds in visits.items():
        ds = sorted(set(ds))
        rec = (today - ds[-1]).days
        gaps = [(b - a).days for a, b in zip(ds, ds[1:], strict=False)]
        typical = statistics.median(gaps) if gaps else None
        row = {
            "id": pid[:8],
            "visits": len(ds),
            "last_visit": ds[-1].isoformat(),
            "days_since": rec,
            "typical_gap": typical,
            "avg_spend": round(spend[pid] / len(ds)),
        }
        if len(ds) == 1:
            seg["new" if rec <= 14 else "occasional"].append(row)
        elif typical is not None and rec > max(21, 3 * typical):
            seg["lost"].append(row)
        elif typical is not None and rec > max(7, 2 * typical):
            seg["at_risk"].append(row)
        elif len(ds) >= 4:
            seg["regular"].append(row)
        else:
            seg["occasional"].append(row)
    at_risk_value = sum(r["avg_spend"] for r in seg["at_risk"])
    return {
        "status": "ok",
        "customers": len(visits),
        "counts": {k: len(v) for k, v in seg.items()},
        "at_risk": sorted(seg["at_risk"], key=lambda r: -r["avg_spend"])[:8],
        "at_risk_typical_spend": at_risk_value,
        "note": "Payers are pseudonymous (salted hash). Messaging needs the customer's consent.",
    }


def health_score(
    *,
    demand_days_14: int,
    trials_completed: int,
    trials_open_stale: int,
    sales_trend_pct: float | None,
    p_shortfall: float | None,
    at_risk_share: float | None,
    products_with_cost: int,
    products: int,
) -> dict:
    comps = [
        ("Logs missed demand", min(demand_days_14 / 10, 1.0), 20, f"{demand_days_14} of the last 14 days"),
        (
            "Closes the loop on trials",
            (trials_completed / max(trials_completed + trials_open_stale, 1)) if (trials_completed + trials_open_stale) else 0.5,
            15,
            f"{trials_completed} completed, {trials_open_stale} stale",
        ),
        (
            "Knows its costs",
            products_with_cost / products if products else 0.0,
            15,
            f"{products_with_cost}/{products} products priced",
        ),
        (
            "Sales trend",
            0.5 if sales_trend_pct is None else max(0.0, min(1.0, 0.5 + sales_trend_pct / 40)),
            20,
            "no sales data" if sales_trend_pct is None else f"{sales_trend_pct:+.1f}% vs previous week",
        ),
        (
            "Cash buffer",
            0.5 if p_shortfall is None else 1 - p_shortfall,
            20,
            "add cash & margin" if p_shortfall is None else f"{p_shortfall:.0%} chance of a 30-day shortfall",
        ),
        (
            "Keeps regulars",
            0.5 if at_risk_share is None else 1 - min(at_risk_share * 2, 1.0),
            10,
            "no payer data" if at_risk_share is None else f"{at_risk_share:.0%} of repeat customers at risk",
        ),
    ]
    score = round(sum(v * w for _, v, w, _ in comps))
    return {
        "score": score,
        "band": "strong" if score >= 75 else "steady" if score >= 55 else "needs attention",
        "components": [{"name": n, "value": round(v, 2), "weight": w, "detail": d} for n, v, w, d in comps],
        "disclaimer": "A business-habits score to guide the owner. Not a credit score and never used for lending decisions.",
    }
