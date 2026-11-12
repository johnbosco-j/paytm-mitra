"""Deterministic opportunity engine: confirmed demand + catalog -> ranked, explained stocking trials."""

from __future__ import annotations

import re
from collections import defaultdict
from datetime import UTC, datetime, timedelta, timezone
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from . import economics as econ
from .models import DemandRequest, Product, Store, Trial

SCORE_VERSION = "score-v1"
WEIGHTS = {
    "frequency": 0.25,
    "recency": 0.20,
    "margin": 0.20,
    "repeat_days": 0.15,
    "stock_gap": 0.10,
    "evidence": 0.10,
}


def normalize_item(text: str) -> str:
    t = text.strip().lower()
    t = re.sub(r"[^\w\s\-஀-௿]", " ", t)  # keep Tamil block
    return re.sub(r"\s+", " ", t).strip()


def match_product(item: str, products: list[Product]) -> Product | None:
    key = normalize_item(item)
    for p in products:
        names = [normalize_item(p.name)] + [normalize_item(a) for a in (p.aliases or [])]
        if key in names:
            return p
    return None


def _aware(dt: datetime) -> datetime:
    return dt if dt.tzinfo else dt.replace(tzinfo=UTC)


def compute_opportunities(db: Session, store: Store, window_days: int = 7, now: datetime | None = None) -> list[dict]:
    now = now or datetime.now(UTC)
    since = now - timedelta(days=window_days)
    rows = db.scalars(
        select(DemandRequest).where(
            DemandRequest.store_id == store.id,
            DemandRequest.status == "confirmed",
            DemandRequest.requested_at >= since,
        )
    ).all()
    products = db.scalars(select(Product).where(Product.store_id == store.id)).all()
    open_trials = {
        t.normalized_item: t
        for t in db.scalars(
            select(Trial).where(Trial.store_id == store.id, Trial.status.in_(["pending_approval", "approved", "active"]))
        ).all()
    }

    groups: dict[str, list[DemandRequest]] = defaultdict(list)
    for r in rows:
        groups[r.normalized_item].append(r)

    out = []
    for item, reqs in groups.items():
        asks = sum(r.ask_count for r in reqs)
        days = {_aware(r.requested_at).astimezone(timezone(timedelta(hours=5, minutes=30))).date() for r in reqs}
        last = max(_aware(r.requested_at) for r in reqs)
        days_since = max((now - last).total_seconds() / 86400, 0)
        product = match_product(item, products) or next((p for p in products if any(r.product_id == p.id for r in reqs)), None)
        has_cost = bool(product and product.cost_price is not None and product.sell_price is not None)
        stock = product.stock_qty if product else 0

        margin_pct = None
        if has_cost and product.sell_price > 0:
            margin_pct = (product.sell_price - product.cost_price) / product.sell_price

        comp = {
            "frequency": min(asks / 20, 1.0),
            "recency": max(0.0, 1 - days_since / window_days),
            "margin": float(min(max(margin_pct, Decimal(0)) / Decimal("0.4"), Decimal(1))) if margin_pct is not None else 0.0,
            "repeat_days": min(len(days) / min(window_days, 7), 1.0),
            "stock_gap": 1.0 if stock <= 0 else max(0.0, 1 - stock / max(asks, 1)),
            "evidence": min(len(reqs) / 5, 1.0),
        }
        score = round(100 * sum(WEIGHTS[k] * v for k, v in comp.items()))

        status = "ready"
        blockers: list[str] = []
        if asks < 3 or len(days) < 2:
            status = "insufficient_evidence"
            blockers.append("Needs at least 3 asks on 2 different days before suggesting a purchase.")
        if not has_cost:
            status = "needs_cost" if status == "ready" else status
            blockers.append(
                "Add buying and selling price for this item to see margin. MITRA will not estimate profit without them."
            )
        elif margin_pct is not None and margin_pct <= 0:
            status = "unprofitable"
            blockers.append("Selling price does not cover buying price.")

        sizing = econ.propose_trial_quantity(
            asks,
            window_days,
            stock_on_hand=stock,
            shelf_life_days=product.shelf_life_days if product else None,
            unit_cost=product.cost_price if has_cost else None,
            budget=store.trial_budget,
        )
        scenarios = (
            [s.as_dict() for s in econ.scenario_grid(sizing.quantity, product.cost_price, product.sell_price)]
            if has_cost and sizing.quantity > 0
            else []
        )
        out.append(
            {
                "item": item,
                "display_name": product.name if product else reqs[0].raw_item,
                "score": score,
                "score_version": SCORE_VERSION,
                "components": {k: round(v, 3) for k, v in comp.items()},
                "weights": WEIGHTS,
                "status": status,
                "blockers": blockers,
                "evidence": {
                    "ask_total": asks,
                    "records": len(reqs),
                    "distinct_days": len(days),
                    "last_ask_at": last.isoformat(),
                    "window_days": window_days,
                    "reasons": sorted({r.reason for r in reqs}),
                    "sample_share": round(sum(1 for r in reqs if r.source_type == "sample_seed") / len(reqs), 2),
                    "request_ids": [r.id for r in sorted(reqs, key=lambda r: r.requested_at, reverse=True)][:20],
                },
                "product": (
                    {
                        "id": product.id,
                        "name": product.name,
                        "cost_price": str(product.cost_price) if product.cost_price is not None else None,
                        "sell_price": str(product.sell_price) if product.sell_price is not None else None,
                        "stock_qty": product.stock_qty,
                        "shelf_life_days": product.shelf_life_days,
                        "unit": product.unit,
                        "supplier_name": product.supplier_name,
                    }
                    if product
                    else None
                ),
                "margin_pct": str((margin_pct * 100).quantize(Decimal("0.1"))) if margin_pct is not None else None,
                "proposal": {"quantity": sizing.quantity, "reasons": sizing.reasons, "math_version": econ.MATH_VERSION},
                "scenarios": scenarios,
                "open_trial_id": open_trials[item].id if item in open_trials else None,
            }
        )
    out.sort(key=lambda o: (o["status"] != "ready", -o["score"]))
    return out
