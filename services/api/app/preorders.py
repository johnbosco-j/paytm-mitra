"""Pre-orders: turn a missed ask into a reserved (optionally prepaid) sale via Paytm Payment Links or a UPI QR."""

from __future__ import annotations

import re
import secrets
from decimal import Decimal
from typing import Literal
from urllib.parse import quote

from fastapi import APIRouter, Depends, Header
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import select
from sqlalchemy.orm import Session

from . import ai, paytm
from . import crypto as pii
from . import economics as econ
from .config import get_settings
from .db import get_db
from .models import IdempotencyRecord, PreOrder, Product, StockMovement
from .opportunities import match_product, normalize_item
from .security import StoreContext, api_error, audit, require_owner, store_context

router = APIRouter(prefix="/api")

TRANSITIONS = {
    "awaiting_payment": {"paid", "cancelled", "fulfilled"},
    "paid": {"fulfilled", "cancelled"},
    "fulfilled": set(),
    "cancelled": set(),
}


def s_preorder(p: PreOrder) -> dict:
    return {
        "id": p.id,
        "item": p.item,
        "product_id": p.product_id,
        "quantity": p.quantity,
        "amount": str(econ.money(p.amount)),
        "customer_name": p.customer_name,
        "phone": p.phone_masked,
        "consent_contact": p.consent_contact,
        "method": p.method,
        "status": p.status,
        "pay_url": p.pay_url,
        "order_ref": p.order_ref,
        "paytm_link_id": p.paytm_link_id,
        "created_at": (
            p.created_at if p.created_at.tzinfo else p.created_at.replace(tzinfo=__import__("datetime").UTC)
        ).isoformat(),
    }


class PreOrderIn(BaseModel):
    item: str = Field(min_length=1, max_length=120)
    product_id: str | None = None
    quantity: int = Field(ge=1, le=500)
    unit_price: Decimal | None = Field(default=None, ge=0, max_digits=12, decimal_places=2)
    customer_name: str = Field(min_length=1, max_length=80)
    phone: str | None = Field(default=None, max_length=16)
    consent_contact: bool = False
    method: Literal["paytm_link", "upi_qr", "cash"] = "upi_qr"

    @field_validator("phone")
    @classmethod
    def _phone(cls, v: str | None) -> str | None:
        if not v:
            return None
        d = re.sub(r"\D", "", v)
        if d.startswith("91") and len(d) == 12:
            d = d[2:]
        if not re.fullmatch(r"[6-9]\d{9}", d):
            raise ValueError("Enter a valid 10-digit Indian mobile number.")
        return d


@router.get("/integrations")
def integrations(ctx: StoreContext = Depends(store_context)):
    return {
        "paytm_links": {"connected": paytm.configured(), "env": get_settings().paytm_env if paytm.configured() else None, "sandbox": paytm.sandbox()},
        "upi_qr": {"configured": bool(ctx.store.upi_vpa), "vpa": ctx.store.upi_vpa},
        "offline_model": ai.local_status(force=True),
        "cloud_ai": ai.ai_available(),
        "ai_mode": ctx.store.ai_mode or "auto",
    }


@router.get("/preorders")
def list_preorders(ctx: StoreContext = Depends(store_context), db: Session = Depends(get_db)):
    rows = db.scalars(select(PreOrder).where(PreOrder.store_id == ctx.store.id).order_by(PreOrder.created_at.desc()).limit(300))
    return [s_preorder(p) for p in rows]


@router.post("/preorders", status_code=201)
def create_preorder(
    body: PreOrderIn,
    ctx: StoreContext = Depends(store_context),
    db: Session = Depends(get_db),
    idempotency_key: str | None = Header(None),
):
    if idempotency_key:
        prev = db.scalar(
            select(IdempotencyRecord).where(
                IdempotencyRecord.store_id == ctx.store.id,
                IdempotencyRecord.action == "preorder.create",
                IdempotencyRecord.key == idempotency_key,
            )
        )
        if prev:
            return prev.response
    if body.phone and not body.consent_contact:
        raise api_error(422, "CONSENT_REQUIRED", "Ask the customer before saving their number, then tick consent.")
    products = db.scalars(select(Product).where(Product.store_id == ctx.store.id)).all()
    product = None
    if body.product_id:
        product = next((p for p in products if p.id == body.product_id), None)
        if not product:
            raise api_error(404, "NOT_FOUND", "Product not found.")
    else:
        product = match_product(body.item, products)
    unit = product.sell_price if product and product.sell_price is not None else body.unit_price
    if unit is None:
        raise api_error(422, "NO_PRICE", "Add a selling price for this item (or enter one) before taking a pre-order.")
    amount = econ.money(Decimal(body.quantity) * unit)
    ref = "MITRA" + secrets.token_hex(6).upper()
    pre = PreOrder(
        store_id=ctx.store.id,
        product_id=product.id if product else None,
        item=normalize_item(product.name if product else body.item),
        quantity=body.quantity,
        amount=amount,
        customer_name=body.customer_name.strip(),
        phone_enc=pii.encrypt(body.phone) if body.phone else None,
        phone_masked=pii.mask_phone(body.phone) if body.phone else None,
        consent_contact=body.consent_contact,
        method=body.method,
        order_ref=ref,
        created_by=ctx.user.id,
    )
    if body.method == "paytm_link":
        try:
            link = paytm.create_link(
                amount=amount,
                name=ctx.store.name,
                description=f"Pre-order: {body.quantity} × {pre.item}",
                order_ref=ref,
                customer_name=body.customer_name,
                customer_mobile=body.phone,
            )
        except paytm.PaytmUnavailable as e:
            raise api_error(503, "PAYTM_UNAVAILABLE", str(e)) from e
        pre.paytm_link_id, pre.pay_url = link.link_id, link.short_url
    elif body.method == "upi_qr":
        if not ctx.store.upi_vpa:
            raise api_error(422, "UPI_NOT_SET", "Add your shop's UPI ID in Store settings to show a payment QR.")
        pre.pay_url = (
            f"upi://pay?pa={quote(ctx.store.upi_vpa)}&pn={quote(ctx.store.name)}&am={amount:.2f}&cu=INR"
            f"&tn={quote('Pre-order ' + ref)}&tr={ref}"
        )
    db.add(pre)
    db.flush()
    audit(
        db,
        ctx,
        "preorder.created",
        "preorder",
        pre.id,
        f"Pre-order {pre.quantity} × {pre.item} for ₹{amount} via {body.method}",
        {"method": body.method},
    )
    out = s_preorder(pre)
    if idempotency_key:
        db.add(IdempotencyRecord(store_id=ctx.store.id, action="preorder.create", key=idempotency_key[:80], response=out))
    db.commit()
    return out


class StatusIn(BaseModel):
    status: Literal["paid", "fulfilled", "cancelled"]


def _owned(db: Session, ctx: StoreContext, pid: str) -> PreOrder:
    p = db.get(PreOrder, pid)
    if not p or p.store_id != ctx.store.id:
        raise api_error(404, "NOT_FOUND", "Pre-order not found.")
    return p


@router.post("/preorders/{pid}/status")
def set_status(pid: str, body: StatusIn, ctx: StoreContext = Depends(store_context), db: Session = Depends(get_db)):
    p = _owned(db, ctx, pid)
    if body.status not in TRANSITIONS[p.status]:
        raise api_error(409, "INVALID_STATE", f"A {p.status.replace('_', ' ')} pre-order can't become {body.status}.")
    if body.status == "cancelled" and p.status == "paid" and not ctx.is_owner:
        raise api_error(403, "OWNER_APPROVAL_REQUIRED", "Only the owner can cancel a paid pre-order (refund needed).")
    if body.status == "fulfilled" and p.product_id:
        prod = db.get(Product, p.product_id)
        if prod.stock_qty < p.quantity:
            raise api_error(422, "NEGATIVE_STOCK", f"Only {prod.stock_qty} {prod.unit} in stock. Receive stock first.")
        prod.stock_qty -= p.quantity
        db.add(
            StockMovement(
                store_id=ctx.store.id,
                product_id=prod.id,
                kind="sale",
                qty_delta=-p.quantity,
                unit_cost=prod.cost_price,
                reference_type="preorder",
                reference_id=p.id,
                created_by=ctx.user.id,
            )
        )
    p.status = body.status
    audit(db, ctx, f"preorder.{body.status}", "preorder", p.id, f"Pre-order {p.order_ref} marked {body.status}")
    db.commit()
    return s_preorder(p)


@router.post("/preorders/{pid}/sync")
def sync_payment(pid: str, ctx: StoreContext = Depends(store_context), db: Session = Depends(get_db)):
    p = _owned(db, ctx, pid)
    if p.method != "paytm_link" or not p.paytm_link_id:
        raise api_error(422, "NOT_PAYTM", "Only Paytm-link pre-orders can be checked automatically.")
    if paytm.sandbox():
        return s_preorder(p)  # the sandbox pay page updates the pre-order directly
    try:
        paid = paytm.fetch_paid(p.paytm_link_id)
    except paytm.PaytmUnavailable as e:
        raise api_error(503, "PAYTM_UNAVAILABLE", str(e)) from e
    if paid and p.status == "awaiting_payment":
        p.status = "paid"
        audit(db, ctx, "preorder.paid", "preorder", p.id, f"Paytm confirmed payment for {p.order_ref}")
        db.commit()
    return s_preorder(p)


@router.get("/preorders/{pid}/contact")
def reveal_contact(pid: str, ctx: StoreContext = Depends(require_owner), db: Session = Depends(get_db)):
    """Owner-only, audited reveal of the customer's phone (to call when stock arrives)."""
    p = _owned(db, ctx, pid)
    if not p.phone_enc:
        raise api_error(404, "NOT_FOUND", "No phone saved for this pre-order.")
    audit(db, ctx, "preorder.contact_revealed", "preorder", p.id, f"Owner viewed contact for {p.order_ref}")
    db.commit()
    return {"phone": pii.decrypt(p.phone_enc)}
