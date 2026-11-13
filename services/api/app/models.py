"""Relational model. Every tenant table carries store_id; money is NUMERIC(12,2) handled as Decimal."""

import uuid
from datetime import UTC, datetime
from decimal import Decimal

from sqlalchemy import JSON, DateTime, ForeignKey, Index, Integer, Numeric, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from .db import Base


def _uuid() -> str:
    return str(uuid.uuid4())


def utcnow() -> datetime:
    return datetime.now(UTC)


Money = Numeric(12, 2)


class User(Base):
    __tablename__ = "users"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    email: Mapped[str] = mapped_column(String(254), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(120))
    password_hash: Mapped[str] = mapped_column(String(100))
    locale: Mapped[str] = mapped_column(String(8), default="en")
    token_version: Mapped[int] = mapped_column(Integer, default=0)  # bump to revoke every session
    failed_logins: Mapped[int] = mapped_column(Integer, default=0)
    locked_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Store(Base):
    __tablename__ = "stores"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    name: Mapped[str] = mapped_column(String(120))
    city: Mapped[str] = mapped_column(String(80), default="")
    category: Mapped[str] = mapped_column(String(40), default="kirana")
    language: Mapped[str] = mapped_column(String(8), default="ta")
    currency: Mapped[str] = mapped_column(String(3), default="INR")
    timezone: Mapped[str] = mapped_column(String(40), default="Asia/Kolkata")
    trial_budget: Mapped[Decimal | None] = mapped_column(Money, nullable=True)
    upi_vpa: Mapped[str | None] = mapped_column(String(80), nullable=True)  # for UPI QR pre-order fallback
    ai_mode: Mapped[str] = mapped_column(String(12), default="auto")  # auto | offline (MITRA-Lite only)
    cash_on_hand: Mapped[Decimal | None] = mapped_column(Money, nullable=True)  # owner-entered, for the cash runway
    avg_margin_pct: Mapped[Decimal | None] = mapped_column(Numeric(5, 2), nullable=True)  # blended gross margin %
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Membership(Base):
    __tablename__ = "store_memberships"
    __table_args__ = (UniqueConstraint("store_id", "user_id"),)
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    store_id: Mapped[str] = mapped_column(ForeignKey("stores.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    role: Mapped[str] = mapped_column(String(16))  # owner | staff
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Product(Base):
    __tablename__ = "products"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    store_id: Mapped[str] = mapped_column(ForeignKey("stores.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(120))
    aliases: Mapped[list] = mapped_column(JSON, default=list)
    category: Mapped[str] = mapped_column(String(40), default="general")
    unit: Mapped[str] = mapped_column(String(20), default="piece")
    cost_price: Mapped[Decimal | None] = mapped_column(Money, nullable=True)
    sell_price: Mapped[Decimal | None] = mapped_column(Money, nullable=True)
    stock_qty: Mapped[int] = mapped_column(Integer, default=0)
    shelf_life_days: Mapped[int | None] = mapped_column(Integer, nullable=True)
    supplier_name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    source_type: Mapped[str] = mapped_column(String(32), default="merchant_manual")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)


class DemandRequest(Base):
    """One confirmed 'customer asked, we didn't have it' signal. Never created from AI without merchant confirmation."""

    __tablename__ = "demand_requests"
    __table_args__ = (Index("ix_demand_store_time", "store_id", "requested_at"),)
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    store_id: Mapped[str] = mapped_column(ForeignKey("stores.id", ondelete="CASCADE"), index=True)
    raw_item: Mapped[str] = mapped_column(String(200))
    normalized_item: Mapped[str] = mapped_column(String(120), index=True)
    ask_count: Mapped[int] = mapped_column(Integer)  # number of customer asks, NOT units sold
    reason: Mapped[str] = mapped_column(String(24), default="not_stocked")
    notes: Mapped[str] = mapped_column(Text, default="")
    transcript: Mapped[str | None] = mapped_column(Text, nullable=True)
    language: Mapped[str | None] = mapped_column(String(16), nullable=True)
    product_id: Mapped[str | None] = mapped_column(ForeignKey("products.id", ondelete="SET NULL"), nullable=True)
    source_type: Mapped[str] = mapped_column(String(32))  # merchant_manual | ai_extracted_confirmed | sample_seed
    extractor: Mapped[str | None] = mapped_column(String(60), nullable=True)
    status: Mapped[str] = mapped_column(String(16), default="confirmed")  # confirmed | dismissed
    requested_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    created_by: Mapped[str] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Trial(Base):
    __tablename__ = "trials"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    store_id: Mapped[str] = mapped_column(ForeignKey("stores.id", ondelete="CASCADE"), index=True)
    product_id: Mapped[str] = mapped_column(ForeignKey("products.id"))
    normalized_item: Mapped[str] = mapped_column(String(120))
    status: Mapped[str] = mapped_column(String(20), default="pending_approval")
    proposed_qty: Mapped[int] = mapped_column(Integer)
    unit_cost: Mapped[Decimal] = mapped_column(Money)
    unit_price: Mapped[Decimal] = mapped_column(Money)
    snapshot: Mapped[dict] = mapped_column(JSON, default=dict)  # immutable assumptions at proposal time
    proposed_by: Mapped[str] = mapped_column(ForeignKey("users.id"))
    decided_by: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    decided_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    decision_note: Mapped[str] = mapped_column(Text, default="")
    received_qty: Mapped[int | None] = mapped_column(Integer, nullable=True)
    actual_unit_cost: Mapped[Decimal | None] = mapped_column(Money, nullable=True)
    sold_qty: Mapped[int | None] = mapped_column(Integer, nullable=True)
    wasted_qty: Mapped[int | None] = mapped_column(Integer, nullable=True)
    actual_unit_price: Mapped[Decimal | None] = mapped_column(Money, nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class StockMovement(Base):
    """Append-only stock ledger; product.stock_qty is only changed alongside a movement row."""

    __tablename__ = "stock_movements"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    store_id: Mapped[str] = mapped_column(ForeignKey("stores.id", ondelete="CASCADE"), index=True)
    product_id: Mapped[str] = mapped_column(ForeignKey("products.id", ondelete="CASCADE"))
    kind: Mapped[str] = mapped_column(String(16))  # purchase | sale | waste | adjustment
    qty_delta: Mapped[int] = mapped_column(Integer)
    unit_cost: Mapped[Decimal | None] = mapped_column(Money, nullable=True)
    reference_type: Mapped[str | None] = mapped_column(String(24), nullable=True)
    reference_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    created_by: Mapped[str] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class AuditEvent(Base):
    __tablename__ = "audit_events"
    __table_args__ = (Index("ix_audit_store_time", "store_id", "created_at"),)
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    store_id: Mapped[str] = mapped_column(ForeignKey("stores.id", ondelete="CASCADE"))
    actor_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    action: Mapped[str] = mapped_column(String(60))
    entity_type: Mapped[str] = mapped_column(String(30))
    entity_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    summary: Mapped[str] = mapped_column(Text, default="")
    data: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class IdempotencyRecord(Base):
    __tablename__ = "idempotency_records"
    __table_args__ = (UniqueConstraint("store_id", "action", "key"),)
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    store_id: Mapped[str] = mapped_column(ForeignKey("stores.id", ondelete="CASCADE"))
    action: Mapped[str] = mapped_column(String(80))
    key: Mapped[str] = mapped_column(String(80))
    response: Mapped[dict] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class PreOrder(Base):
    """A customer who asked for a missing item reserves it, optionally paying in advance (Paytm link or UPI)."""

    __tablename__ = "preorders"
    __table_args__ = (Index("ix_preorder_store_time", "store_id", "created_at"),)
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    store_id: Mapped[str] = mapped_column(ForeignKey("stores.id", ondelete="CASCADE"), index=True)
    product_id: Mapped[str | None] = mapped_column(ForeignKey("products.id", ondelete="SET NULL"), nullable=True)
    item: Mapped[str] = mapped_column(String(120))
    quantity: Mapped[int] = mapped_column(Integer)
    amount: Mapped[Decimal] = mapped_column(Money)
    customer_name: Mapped[str] = mapped_column(String(80))
    phone_enc: Mapped[str | None] = mapped_column(Text, nullable=True)  # Fernet-encrypted; never logged
    phone_masked: Mapped[str | None] = mapped_column(String(20), nullable=True)
    consent_contact: Mapped[bool] = mapped_column(default=False)
    method: Mapped[str] = mapped_column(String(16))  # paytm_link | upi_qr | cash
    status: Mapped[str] = mapped_column(String(20), default="awaiting_payment")  # awaiting_payment|paid|fulfilled|cancelled
    paytm_link_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    pay_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    order_ref: Mapped[str] = mapped_column(String(50), unique=True)
    created_by: Mapped[str] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)


class Sale(Base):
    """A completed sale (manual entry, Paytm statement CSV import or sample). Payers are pseudonymous (salted hash)."""

    __tablename__ = "sales"
    __table_args__ = (UniqueConstraint("store_id", "external_ref"), Index("ix_sales_store_time", "store_id", "occurred_at"))
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    store_id: Mapped[str] = mapped_column(ForeignKey("stores.id", ondelete="CASCADE"), index=True)
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    amount: Mapped[Decimal] = mapped_column(Money)
    method: Mapped[str] = mapped_column(String(12), default="upi")  # upi | cash | card | other
    payer_hash: Mapped[str | None] = mapped_column(String(24), nullable=True)
    external_ref: Mapped[str] = mapped_column(String(80))
    source_type: Mapped[str] = mapped_column(String(24))  # merchant_manual | paytm_csv | sample_seed
    created_by: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Expense(Base):
    """Known recurring or one-off outflows for the cash runway (rent, power, supplier dues, salaries)."""

    __tablename__ = "expenses"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    store_id: Mapped[str] = mapped_column(ForeignKey("stores.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(80))
    amount: Mapped[Decimal] = mapped_column(Money)
    cadence: Mapped[str] = mapped_column(String(10))  # once | weekly | monthly
    next_due: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
