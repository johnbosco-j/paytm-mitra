"""Growth APIs: sales ledger + Paytm statement import, expenses, insights, shelf scanner and spoken answers."""

from __future__ import annotations

import csv
import hashlib
import io
import re
from datetime import UTC, datetime, timedelta
from decimal import Decimal, InvalidOperation
from typing import Literal

from fastapi import APIRouter, Depends, File, Form, UploadFile
from fastapi.responses import Response
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from . import ai
from . import insights as ins
from .db import get_db
from .models import DemandRequest, Expense, Product, Sale, Trial, utcnow
from .opportunities import match_product
from .security import StoreContext, api_error, audit, require_owner, store_context

router = APIRouter(prefix="/api")


def _sales(db: Session, ctx: StoreContext, days: int) -> list[Sale]:
    since = utcnow() - timedelta(days=days)
    return db.scalars(select(Sale).where(Sale.store_id == ctx.store.id, Sale.occurred_at >= since)).all()


def payer_hash(store_id: str, payer: str) -> str:
    """Pseudonymous payer id: salted per store, so the same VPA can't be linked across shops."""
    return hashlib.sha256(f"{store_id}:{payer.strip().lower()}".encode()).hexdigest()[:16]


# ---------------------------------------------------------------- sales


class SaleIn(BaseModel):
    amount: Decimal = Field(gt=0, max_digits=12, decimal_places=2)
    method: Literal["upi", "cash", "card", "other"] = "cash"
    occurred_at: datetime | None = None


@router.post("/sales", status_code=201)
def add_sale(body: SaleIn, ctx: StoreContext = Depends(store_context), db: Session = Depends(get_db)):
    when = body.occurred_at or utcnow()
    s = Sale(
        store_id=ctx.store.id,
        occurred_at=when if when.tzinfo else when.replace(tzinfo=UTC),
        amount=body.amount,
        method=body.method,
        external_ref=f"manual-{utcnow().timestamp():.6f}",
        source_type="merchant_manual",
        created_by=ctx.user.id,
    )
    db.add(s)
    db.commit()
    return {"id": s.id, "amount": str(s.amount), "method": s.method, "occurred_at": s.occurred_at.isoformat()}


@router.get("/sales/summary")
def sales_summary(days: int = 30, ctx: StoreContext = Depends(store_context), db: Session = Depends(get_db)):
    rows = _sales(db, ctx, max(1, min(days, 365)))
    today = datetime.now(ins.IST).date()
    series = ins.daily_totals(rows, min(days, 60), today + timedelta(days=1))
    by_method: dict[str, float] = {}
    for r in rows:
        by_method[r.method] = by_method.get(r.method, 0) + float(r.amount)
    return {
        "days": days,
        "count": len(rows),
        "total": round(sum(float(r.amount) for r in rows)),
        "series": [{"date": d.isoformat(), "amount": round(v)} for d, v in series],
        "by_method": {k: round(v) for k, v in by_method.items()},
        "sources": sorted({r.source_type for r in rows}),
    }


COLS = {
    "date": ["transaction date", "txn date", "date & time", "date and time", "date", "created at", "created_at", "time"],
    "amount": ["transaction amount", "txn amount", "amount (rs.)", "amount", "amount(inr)"],
    "status": ["status", "transaction status", "txn status"],
    "payer": ["customer vpa", "payer vpa", "customer upi id", "upi id", "payer", "customer name", "from"],
    "ref": ["order id", "transaction id", "txn id", "utr", "utr no", "reference", "rrn"],
    "method": ["payment mode", "mode", "payment method", "instrument"],
}
DATE_FMTS = [
    "%Y-%m-%d %H:%M:%S",
    "%d-%m-%Y %H:%M:%S",
    "%d/%m/%Y %H:%M:%S",
    "%d/%m/%Y %H:%M",
    "%d-%m-%Y %H:%M",
    "%Y-%m-%dT%H:%M:%S",
    "%d %b %Y %H:%M:%S",
    "%d %b %Y, %I:%M %p",
    "%d-%b-%Y %H:%M:%S",
    "%Y-%m-%d",
    "%d/%m/%Y",
    "%d-%m-%Y",
]


def _find(headers: list[str], key: str) -> str | None:
    low = {h.strip().lower(): h for h in headers}
    for cand in COLS[key]:
        if cand in low:
            return low[cand]
    return None


def _parse_date(v: str) -> datetime | None:
    v = v.strip()
    for f in DATE_FMTS:
        try:
            return datetime.strptime(v, f).replace(tzinfo=ins.IST)
        except ValueError:
            continue
    return None


@router.post("/sales/import")
async def import_sales(
    file: UploadFile = File(...),
    dry_run: bool = Form(False),
    ctx: StoreContext = Depends(require_owner),
    db: Session = Depends(get_db),
):
    """Import a Paytm for Business transaction statement (CSV). Payer VPAs are hashed; raw values are never stored."""
    raw = await file.read()
    if len(raw) > 5 * 1024 * 1024:
        raise api_error(413, "FILE_TOO_LARGE", "Statement must be under 5 MB.")
    text = raw.decode("utf-8-sig", errors="replace")
    reader = csv.DictReader(io.StringIO(text))
    headers = reader.fieldnames or []
    cols = {k: _find(headers, k) for k in COLS}
    if not cols["date"] or not cols["amount"]:
        raise api_error(422, "INVALID_IMPORT", "Couldn't find date and amount columns in this file.")
    imported, dup, skipped, errors, preview = 0, 0, 0, [], []
    existing = set(db.scalars(select(Sale.external_ref).where(Sale.store_id == ctx.store.id)).all())
    for n, row in enumerate(reader, start=2):
        if cols["status"] and row.get(cols["status"], "").strip().upper() not in (
            "SUCCESS",
            "TXN_SUCCESS",
            "SUCCESSFUL",
            "COMPLETED",
            "PAID",
        ):
            skipped += 1
            continue
        when = _parse_date(row.get(cols["date"], ""))
        try:
            amt = Decimal(re.sub(r"[^\d.]", "", row.get(cols["amount"], "")))
        except InvalidOperation:
            amt = None
        if not when or not amt or amt <= 0:
            if len(errors) < 5:
                errors.append(f"row {n}: unreadable date or amount")
            skipped += 1
            continue
        ref_src = row.get(cols["ref"], "") if cols["ref"] else ""
        ref = "paytm-" + (ref_src.strip() or hashlib.sha1(f"{when.isoformat()}|{amt}|{n}".encode()).hexdigest()[:20])
        if ref in existing:
            dup += 1
            continue
        existing.add(ref)
        payer = row.get(cols["payer"], "").strip() if cols["payer"] else ""
        mode = (row.get(cols["method"], "") if cols["method"] else "upi").lower()
        method = "upi" if "upi" in mode or not mode else "card" if "card" in mode else "other"
        if len(preview) < 5:
            preview.append({"date": when.isoformat(), "amount": str(amt), "method": method, "payer": "hashed" if payer else None})
        if not dry_run:
            db.add(
                Sale(
                    store_id=ctx.store.id,
                    occurred_at=when,
                    amount=amt,
                    method=method,
                    payer_hash=payer_hash(ctx.store.id, payer) if payer else None,
                    external_ref=ref[:80],
                    source_type="paytm_csv",
                    created_by=ctx.user.id,
                )
            )
        imported += 1
    if not dry_run:
        audit(
            db,
            ctx,
            "sales.imported",
            "sales",
            None,
            f"Imported {imported} sales from {file.filename or 'statement'}",
            {"duplicates": dup, "skipped": skipped},
        )
        try:
            db.commit()
        except IntegrityError as e:
            db.rollback()
            raise api_error(409, "DUPLICATE_EVENT", "Some rows were already imported. Try again.") from e
    return {
        "dry_run": dry_run,
        "imported": imported,
        "duplicates": dup,
        "skipped": skipped,
        "errors": errors,
        "columns": {k: v for k, v in cols.items() if v},
        "preview": preview,
    }


# ---------------------------------------------------------------- expenses


class ExpenseIn(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    amount: Decimal = Field(gt=0, max_digits=12, decimal_places=2)
    cadence: Literal["once", "weekly", "monthly"] = "monthly"
    next_due: datetime


def s_exp(e: Expense) -> dict:
    nd = e.next_due if e.next_due.tzinfo else e.next_due.replace(tzinfo=UTC)
    return {"id": e.id, "name": e.name, "amount": str(e.amount), "cadence": e.cadence, "next_due": nd.isoformat()}


@router.get("/expenses")
def list_expenses(ctx: StoreContext = Depends(store_context), db: Session = Depends(get_db)):
    return [s_exp(e) for e in db.scalars(select(Expense).where(Expense.store_id == ctx.store.id).order_by(Expense.next_due))]


@router.post("/expenses", status_code=201)
def add_expense(body: ExpenseIn, ctx: StoreContext = Depends(require_owner), db: Session = Depends(get_db)):
    e = Expense(
        store_id=ctx.store.id,
        name=body.name.strip(),
        amount=body.amount,
        cadence=body.cadence,
        next_due=body.next_due if body.next_due.tzinfo else body.next_due.replace(tzinfo=UTC),
    )
    db.add(e)
    audit(db, ctx, "expense.added", "expense", None, f"Added expense {e.name} ₹{e.amount} ({e.cadence})")
    db.commit()
    return s_exp(e)


@router.delete("/expenses/{eid}")
def delete_expense(eid: str, ctx: StoreContext = Depends(require_owner), db: Session = Depends(get_db)):
    e = db.get(Expense, eid)
    if not e or e.store_id != ctx.store.id:
        raise api_error(404, "NOT_FOUND", "Expense not found.")
    db.delete(e)
    audit(db, ctx, "expense.removed", "expense", eid, f"Removed expense {e.name}")
    db.commit()
    return {"ok": True}


# ---------------------------------------------------------------- insights


def _commitments(db: Session, ctx: StoreContext) -> Decimal:
    trials = db.scalars(select(Trial).where(Trial.store_id == ctx.store.id, Trial.status == "approved")).all()
    return sum((Decimal(t.proposed_qty) * t.unit_cost for t in trials), Decimal(0))


@router.get("/insights/forecast")
def insight_forecast(ctx: StoreContext = Depends(store_context), db: Session = Depends(get_db)):
    return ins.forecast(_sales(db, ctx, 80))


@router.get("/insights/cashflow")
def insight_cash(ctx: StoreContext = Depends(store_context), db: Session = Depends(get_db)):
    exps = db.scalars(select(Expense).where(Expense.store_id == ctx.store.id)).all()
    return ins.cash_runway(_sales(db, ctx, 60), exps, ctx.store.cash_on_hand, ctx.store.avg_margin_pct, _commitments(db, ctx))


@router.get("/insights/customers")
def insight_customers(ctx: StoreContext = Depends(store_context), db: Session = Depends(get_db)):
    return ins.customer_segments(_sales(db, ctx, 120))


@router.get("/insights/health")
def insight_health(ctx: StoreContext = Depends(store_context), db: Session = Depends(get_db)):
    now = utcnow()
    demand = db.scalars(
        select(DemandRequest).where(
            DemandRequest.store_id == ctx.store.id,
            DemandRequest.status == "confirmed",
            DemandRequest.requested_at >= now - timedelta(days=14),
        )
    ).all()
    days = len({ins._ist_day(r.requested_at) for r in demand})
    trials = db.scalars(select(Trial).where(Trial.store_id == ctx.store.id)).all()
    stale = sum(
        1
        for t in trials
        if t.status in ("approved", "active")
        and (now - (t.created_at if t.created_at.tzinfo else t.created_at.replace(tzinfo=UTC))).days > 10
    )
    products = db.scalars(select(Product).where(Product.store_id == ctx.store.id)).all()
    fc = ins.forecast(_sales(db, ctx, 80))
    cash = insight_cash(ctx, db)
    cust = ins.customer_segments(_sales(db, ctx, 120))
    at_risk = None
    if cust.get("status") == "ok":
        c = cust["counts"]
        rep = c["regular"] + c["at_risk"] + c["lost"]
        at_risk = (c["at_risk"] + c["lost"]) / rep if rep else 0.0
    return ins.health_score(
        demand_days_14=days,
        trials_completed=sum(1 for t in trials if t.status == "completed"),
        trials_open_stale=stale,
        sales_trend_pct=fc.get("trend_pct") if fc.get("status") == "ok" else None,
        p_shortfall=cash.get("probability_shortfall") if cash.get("status") == "ok" else None,
        at_risk_share=at_risk,
        products_with_cost=sum(1 for p in products if p.cost_price is not None and p.sell_price is not None),
        products=len(products),
    )


# ---------------------------------------------------------------- shelf scanner (vision)

ALLOWED_IMG = {"image/jpeg", "image/png", "image/webp", "image/heic"}


@router.post("/shelf/scan")
async def shelf_scan(image: UploadFile = File(...), ctx: StoreContext = Depends(store_context), db: Session = Depends(get_db)):
    """Photo of a shelf -> visible products with fill level + empty gaps. Results are drafts: the merchant confirms."""
    mime = (image.content_type or "").split(";")[0]
    if mime not in ALLOWED_IMG:
        raise api_error(415, "UNSUPPORTED_IMAGE", "Upload a JPG, PNG or WebP photo.")
    blob = await image.read()
    if not 5_000 < len(blob) < 8 * 1024 * 1024:
        raise api_error(422, "INVALID_IMAGE", "Photo must be between 5 KB and 8 MB.")
    products = db.scalars(select(Product).where(Product.store_id == ctx.store.id)).all()
    try:
        res = ai.scan_shelf(blob, mime, [p.name for p in products])
    except ai.ProviderUnavailable as e:
        raise api_error(
            503, "PROVIDER_UNAVAILABLE", f"{e}. Shelf scanning needs the cloud AI; log items by voice or text instead."
        ) from e
    for item in res["products"]:
        p = match_product(item["name"], products)
        item["product_id"] = p.id if p else None
        item["product_name"] = p.name if p else None
        item["stock_qty"] = p.stock_qty if p else None
    audit(
        db,
        ctx,
        "shelf.scanned",
        "shelf",
        None,
        f"Shelf scan: {len(res['products'])} products, {res['empty_slots']} empty slots",
        {"model": res["model"]},
    )
    db.commit()
    return res


# ---------------------------------------------------------------- spoken answers


class SpeakIn(BaseModel):
    text: str = Field(min_length=1, max_length=600)


@router.post("/speak")
def speak(body: SpeakIn, ctx: StoreContext = Depends(store_context)):
    """Text -> natural speech (WAV) for answers, like a Soundbox voice. Falls back to the device's own voice offline."""
    if (ctx.store.ai_mode or "auto") == "offline":
        raise api_error(503, "OFFLINE_MODE", "Offline mode: using this device's voice.")
    try:
        wav = ai.text_to_speech(body.text)
    except ai.ProviderUnavailable as e:
        raise api_error(503, "PROVIDER_UNAVAILABLE", str(e)) from e
    return Response(content=wav, media_type="audio/wav")
