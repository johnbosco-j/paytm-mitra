"""MITRA API — Missed-demand Intelligence for Trade, Restock & Action.

The LEAP loop: Listen (capture missed demand) -> Evaluate (deterministic economics) -> Approve (owner-only) -> Prove (outcomes).
"""

from __future__ import annotations

import logging
import uuid
from collections import Counter, defaultdict
from contextlib import asynccontextmanager
from datetime import UTC, datetime, timedelta, timezone
from decimal import Decimal
from typing import Annotated, Literal

from fastapi import Depends, FastAPI, File, Form, Header, Request, Response, UploadFile
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import AfterValidator, BaseModel, Field, StringConstraints, field_validator
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from starlette.exceptions import HTTPException as StarletteHTTPException

from . import ai, langs, paytm, sarvam
from . import economics as econ
from .config import get_settings
from .db import Base, engine, get_db
from .hardening import COMMON_PASSWORDS, OriginGuard, SecurityHeaders, client_ip, login_limiter, signup_limiter
from .models import (
    AuditEvent,
    DemandRequest,
    IdempotencyRecord,
    Membership,
    Product,
    StockMovement,
    Store,
    Trial,
    User,
    utcnow,
)
from .opportunities import compute_opportunities, match_product, normalize_item
from .security import (
    COOKIE_NAME,
    StoreContext,
    api_error,
    audit,
    current_user,
    hash_password,
    issue_token,
    require_owner,
    store_context,
    verify_password,
)

# Simple, permissive email shape check (allows .test/.local for local demo accounts).
EmailStr = Annotated[
    str, StringConstraints(strip_whitespace=True, to_lower=True, max_length=254, pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
]

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")


def _lang(code: str) -> str:
    found = langs.get(code)
    if not found:
        raise ValueError("Unsupported language. Use one of India's 22 scheduled languages, English or a code-mix like ta-Latn.")
    return found.code


LangCode = Annotated[str, AfterValidator(_lang)]

log = logging.getLogger("mitra.api")


@asynccontextmanager
async def lifespan(_app: FastAPI):
    # Production/dev schema is owned by Alembic (`alembic upgrade head`); tests opt in to create_all.
    if get_settings().auto_create_schema:
        Base.metadata.create_all(engine)
    yield


app = FastAPI(
    title="MITRA API", version="0.1.0", description="Missed-demand Intelligence for Trade, Restock & Action", lifespan=lifespan
)
app.add_middleware(SecurityHeaders)
app.add_middleware(OriginGuard)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in get_settings().cors_origins.split(",")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def correlation_id(request: Request, call_next):
    cid = request.headers.get("x-correlation-id") or uuid.uuid4().hex[:12]
    request.state.cid = cid
    response = await call_next(request)
    response.headers["x-correlation-id"] = cid
    return response


@app.exception_handler(StarletteHTTPException)
async def http_error(request: Request, exc: StarletteHTTPException):
    detail = exc.detail if isinstance(exc.detail, dict) else {"code": "ERROR", "message": str(exc.detail)}
    return JSONResponse(status_code=exc.status_code, content={**detail, "correlation_id": getattr(request.state, "cid", None)})


@app.exception_handler(RequestValidationError)
async def validation_error(request: Request, exc: RequestValidationError):
    fields = [{"field": ".".join(str(p) for p in e["loc"][1:]), "message": e["msg"]} for e in exc.errors()]
    return JSONResponse(
        status_code=422,
        content={
            "code": "INVALID_INPUT",
            "message": "Please check the highlighted fields.",
            "details": fields,
            "correlation_id": getattr(request.state, "cid", None),
        },
    )


# ---------------------------------------------------------------- serializers


def iso(dt: datetime | None) -> str | None:
    """Always emit timezone-aware UTC ISO strings (SQLite returns naive datetimes)."""
    if dt is None:
        return None
    return (dt if dt.tzinfo else dt.replace(tzinfo=UTC)).isoformat()


def s_money(v: Decimal | None) -> str | None:
    return str(econ.money(v)) if v is not None else None


def s_product(p: Product) -> dict:
    return {
        "id": p.id,
        "name": p.name,
        "aliases": p.aliases or [],
        "category": p.category,
        "unit": p.unit,
        "cost_price": s_money(p.cost_price),
        "sell_price": s_money(p.sell_price),
        "stock_qty": p.stock_qty,
        "shelf_life_days": p.shelf_life_days,
        "supplier_name": p.supplier_name,
        "source_type": p.source_type,
        "updated_at": iso(p.updated_at),
    }


def s_request(r: DemandRequest) -> dict:
    return {
        "id": r.id,
        "raw_item": r.raw_item,
        "normalized_item": r.normalized_item,
        "ask_count": r.ask_count,
        "reason": r.reason,
        "notes": r.notes,
        "transcript": r.transcript,
        "language": r.language,
        "product_id": r.product_id,
        "source_type": r.source_type,
        "extractor": r.extractor,
        "status": r.status,
        "requested_at": iso(r.requested_at),
        "created_by": r.created_by,
    }


def s_trial(t: Trial, db: Session) -> dict:
    result = None
    if t.status == "completed":
        result = econ.realized_result(
            t.received_qty or 0,
            t.sold_qty or 0,
            t.wasted_qty or 0,
            t.actual_unit_cost if t.actual_unit_cost is not None else t.unit_cost,
            t.actual_unit_price if t.actual_unit_price is not None else t.unit_price,
        ).as_dict()
    names = {u.id: u.name for u in db.scalars(select(User).where(User.id.in_([x for x in [t.proposed_by, t.decided_by] if x])))}
    product = db.get(Product, t.product_id)
    return {
        "id": t.id,
        "item": t.normalized_item,
        "product_id": t.product_id,
        "product_name": product.name if product else t.normalized_item,
        "unit": product.unit if product else "piece",
        "status": t.status,
        "proposed_qty": t.proposed_qty,
        "unit_cost": s_money(t.unit_cost),
        "unit_price": s_money(t.unit_price),
        "planned_outlay": s_money(econ.money(Decimal(t.proposed_qty) * t.unit_cost)),
        "snapshot": t.snapshot,
        "proposed_by": names.get(t.proposed_by),
        "decided_by": names.get(t.decided_by) if t.decided_by else None,
        "decided_at": iso(t.decided_at),
        "decision_note": t.decision_note,
        "received_qty": t.received_qty,
        "actual_unit_cost": s_money(t.actual_unit_cost),
        "sold_qty": t.sold_qty,
        "wasted_qty": t.wasted_qty,
        "actual_unit_price": s_money(t.actual_unit_price),
        "completed_at": iso(t.completed_at),
        "created_at": iso(t.created_at),
        "result": result,
    }


def idem_lookup(db: Session, ctx: StoreContext, action: str, key: str | None) -> dict | None:
    if not key:
        return None
    rec = db.scalar(
        select(IdempotencyRecord).where(
            IdempotencyRecord.store_id == ctx.store.id, IdempotencyRecord.action == action, IdempotencyRecord.key == key
        )
    )
    return rec.response if rec else None


def idem_save(db: Session, ctx: StoreContext, action: str, key: str | None, response: dict) -> None:
    if key:
        db.add(IdempotencyRecord(store_id=ctx.store.id, action=action, key=key[:80], response=response))


# ---------------------------------------------------------------- health & auth


@app.get("/api/health")
def health():
    s = get_settings()
    return {
        "ok": True,
        "service": "mitra-api",
        "ai_provider": ("sarvam" if sarvam.enabled() else "gemini") if ai.ai_available() else "rules-only",
        "ai_model": (s.sarvam_chat_model if sarvam.enabled() else s.gemini_model) if ai.ai_available() else None,
        "paytm_connector_enabled": s.paytm_connector_enabled,
        "paytm_links": "configured" if paytm.configured() else "not_connected",
        "offline_model": ai.local_status(),
    }


class SignupIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    locale: Literal["en", "ta"] = "en"

    @field_validator("password")
    @classmethod
    def _strong(cls, v: str) -> str:
        if v.lower() in COMMON_PASSWORDS or len(set(v)) < 5:
            raise ValueError("Choose a less common password (at least 8 characters, mixed).")
        return v


class LoginIn(BaseModel):
    email: EmailStr
    password: str


def _set_session(resp: Response, user: User) -> None:
    s = get_settings()
    resp.set_cookie(
        COOKIE_NAME,
        issue_token(user.id, user.token_version or 0),
        httponly=True,
        samesite="lax",
        secure=s.cookie_secure,
        max_age=s.jwt_ttl_hours * 3600,
        path="/",
    )


def _me(db: Session, user: User) -> dict:
    rows = db.execute(
        select(Store, Membership.role).join(Membership, Membership.store_id == Store.id).where(Membership.user_id == user.id)
    ).all()
    return {
        "user": {"id": user.id, "name": user.name, "email": user.email, "locale": user.locale},
        "stores": [{"id": s.id, "name": s.name, "city": s.city, "role": role, "language": s.language} for s, role in rows],
    }


@app.post("/api/auth/signup", status_code=201)
def signup(body: SignupIn, request: Request, response: Response, db: Session = Depends(get_db)):
    if not signup_limiter.allow(client_ip(request)):
        raise api_error(429, "RATE_LIMITED", "Too many sign-ups from this network. Try again later.")
    email = body.email.lower()
    if db.scalar(select(User).where(User.email == email)):
        raise api_error(409, "EMAIL_TAKEN", "An account with this email already exists. Please sign in.")
    user = User(email=email, name=body.name.strip(), password_hash=hash_password(body.password), locale=body.locale)
    db.add(user)
    db.commit()
    _set_session(response, user)
    return _me(db, user)


@app.post("/api/auth/login")
def login(body: LoginIn, request: Request, response: Response, db: Session = Depends(get_db)):
    email = body.email.lower()
    if not login_limiter.allow(f"{client_ip(request)}|{email}"):
        raise api_error(429, "RATE_LIMITED", "Too many attempts. Wait a minute and try again.")
    user = db.scalar(select(User).where(User.email == email))
    now = utcnow()
    if (
        user
        and user.locked_until
        and (user.locked_until if user.locked_until.tzinfo else user.locked_until.replace(tzinfo=UTC)) > now
    ):
        raise api_error(423, "ACCOUNT_LOCKED", "Too many wrong passwords. This account is locked for a few minutes.")
    if not user or not verify_password(body.password, user.password_hash):
        if user:
            user.failed_logins = (user.failed_logins or 0) + 1
            if user.failed_logins >= get_settings().max_failed_logins:
                user.locked_until = now + timedelta(minutes=get_settings().lockout_minutes)
                user.failed_logins = 0
            db.commit()
        raise api_error(401, "BAD_CREDENTIALS", "Email or password is incorrect.")
    user.failed_logins, user.locked_until = 0, None
    db.commit()
    _set_session(response, user)
    return _me(db, user)


@app.post("/api/auth/logout")
def logout(response: Response):
    response.delete_cookie(COOKIE_NAME, path="/")
    return {"ok": True}


@app.post("/api/auth/logout-all")
def logout_all(response: Response, user: User = Depends(current_user), db: Session = Depends(get_db)):
    """Revoke every session for this account (e.g. a lost phone)."""
    user.token_version = (user.token_version or 0) + 1
    db.commit()
    response.delete_cookie(COOKIE_NAME, path="/")
    return {"ok": True}


@app.get("/api/session")
def session(request: Request, db: Session = Depends(get_db), authorization: str | None = Header(None)):
    """Like /api/me but answers 200 with user=null when signed out (no noisy 401s on public pages)."""
    try:
        user = current_user(request, db, authorization)
    except StarletteHTTPException:
        return {"user": None, "stores": []}
    return _me(db, user)


@app.get("/api/me")
def me(user: User = Depends(current_user), db: Session = Depends(get_db)):
    return _me(db, user)


# ---------------------------------------------------------------- stores & members


class StoreIn(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    city: str = Field(default="", max_length=80)
    category: str = Field(default="kirana", max_length=40)
    language: LangCode = "ta"
    trial_budget: Decimal | None = Field(default=None, ge=0, max_digits=12, decimal_places=2)


class StorePatch(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    city: str | None = Field(default=None, max_length=80)
    language: LangCode | None = None
    trial_budget: Decimal | None = Field(default=None, ge=0, max_digits=12, decimal_places=2)
    upi_vpa: Annotated[str, StringConstraints(strip_whitespace=True, pattern=r"^[a-zA-Z0-9._-]{2,64}@[a-zA-Z]{2,32}$")] | None = (
        None
    )
    ai_mode: Literal["auto", "offline"] | None = None
    cash_on_hand: Decimal | None = Field(default=None, ge=0, max_digits=12, decimal_places=2)
    avg_margin_pct: Decimal | None = Field(default=None, ge=0, le=100, max_digits=5, decimal_places=2)


def s_store(s: Store, role: str) -> dict:
    return {
        "id": s.id,
        "name": s.name,
        "city": s.city,
        "category": s.category,
        "language": s.language,
        "currency": s.currency,
        "timezone": s.timezone,
        "trial_budget": s_money(s.trial_budget),
        "upi_vpa": s.upi_vpa,
        "ai_mode": s.ai_mode or "auto",
        "cash_on_hand": s_money(s.cash_on_hand),
        "avg_margin_pct": str(s.avg_margin_pct) if s.avg_margin_pct is not None else None,
        "role": role,
    }


@app.post("/api/stores", status_code=201)
def create_store(body: StoreIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    store = Store(
        name=body.name.strip(),
        city=body.city.strip(),
        category=body.category,
        language=body.language,
        trial_budget=body.trial_budget,
    )
    db.add(store)
    db.flush()
    db.add(Membership(store_id=store.id, user_id=user.id, role="owner"))
    db.add(
        AuditEvent(
            store_id=store.id,
            actor_id=user.id,
            action="store.created",
            entity_type="store",
            entity_id=store.id,
            summary=f"Store '{store.name}' created",
        )
    )
    db.commit()
    return s_store(store, "owner")


@app.get("/api/store")
def get_store(ctx: StoreContext = Depends(store_context)):
    return s_store(ctx.store, ctx.role)


@app.patch("/api/store")
def patch_store(body: StorePatch, ctx: StoreContext = Depends(require_owner), db: Session = Depends(get_db)):
    changes = body.model_dump(exclude_unset=True)
    for k, v in changes.items():
        setattr(ctx.store, k, v)
    db.add(ctx.store)
    audit(db, ctx, "store.updated", "store", ctx.store.id, "Store settings updated", {k: str(v) for k, v in changes.items()})
    db.commit()
    return s_store(ctx.store, ctx.role)


class MemberIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    role: Literal["staff"] = "staff"


@app.get("/api/store/members")
def list_members(ctx: StoreContext = Depends(require_owner), db: Session = Depends(get_db)):
    rows = db.execute(
        select(User, Membership.role).join(Membership, Membership.user_id == User.id).where(Membership.store_id == ctx.store.id)
    ).all()
    return [{"id": u.id, "name": u.name, "email": u.email, "role": r} for u, r in rows]


@app.post("/api/store/members", status_code=201)
def add_member(body: MemberIn, ctx: StoreContext = Depends(require_owner), db: Session = Depends(get_db)):
    email = body.email.lower()
    user = db.scalar(select(User).where(User.email == email))
    if user is None:
        user = User(email=email, name=body.name, password_hash=hash_password(body.password))
        db.add(user)
        db.flush()
    if db.scalar(select(Membership).where(Membership.store_id == ctx.store.id, Membership.user_id == user.id)):
        raise api_error(409, "ALREADY_MEMBER", "This person is already a member of the store.")
    db.add(Membership(store_id=ctx.store.id, user_id=user.id, role=body.role))
    audit(db, ctx, "member.added", "user", user.id, f"{user.name} added as {body.role}")
    db.commit()
    return {"id": user.id, "name": user.name, "email": user.email, "role": body.role}


# ---------------------------------------------------------------- catalog


class ProductIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    aliases: list[str] = Field(default_factory=list, max_length=20)
    category: str = Field(default="general", max_length=40)
    unit: str = Field(default="piece", max_length=20)
    cost_price: Decimal | None = Field(default=None, ge=0, max_digits=12, decimal_places=2)
    sell_price: Decimal | None = Field(default=None, ge=0, max_digits=12, decimal_places=2)
    stock_qty: int = Field(default=0, ge=0, le=1_000_000)
    shelf_life_days: int | None = Field(default=None, ge=1, le=3650)
    supplier_name: str | None = Field(default=None, max_length=120)

    @field_validator("aliases")
    @classmethod
    def _clean_aliases(cls, v: list[str]) -> list[str]:
        return [a.strip()[:80] for a in v if a and a.strip()]


class ProductPatch(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    aliases: list[str] | None = None
    category: str | None = None
    unit: str | None = None
    cost_price: Decimal | None = Field(default=None, ge=0, max_digits=12, decimal_places=2)
    sell_price: Decimal | None = Field(default=None, ge=0, max_digits=12, decimal_places=2)
    shelf_life_days: int | None = Field(default=None, ge=1, le=3650)
    supplier_name: str | None = None


@app.get("/api/products")
def list_products(ctx: StoreContext = Depends(store_context), db: Session = Depends(get_db)):
    return [s_product(p) for p in db.scalars(select(Product).where(Product.store_id == ctx.store.id).order_by(Product.name))]


def _store_product(db: Session, ctx: StoreContext, product_id: str) -> Product:
    p = db.get(Product, product_id)
    if not p or p.store_id != ctx.store.id:
        raise api_error(404, "NOT_FOUND", "Product not found.")
    return p


@app.post("/api/products", status_code=201)
def create_product(body: ProductIn, ctx: StoreContext = Depends(require_owner), db: Session = Depends(get_db)):
    existing = db.scalars(select(Product).where(Product.store_id == ctx.store.id)).all()
    if match_product(body.name, existing):
        raise api_error(409, "DUPLICATE_PRODUCT", "A product with this name or alias already exists.")
    data = body.model_dump()
    opening = data.pop("stock_qty")
    p = Product(store_id=ctx.store.id, **data, stock_qty=opening)
    db.add(p)
    db.flush()
    if opening:
        db.add(
            StockMovement(
                store_id=ctx.store.id,
                product_id=p.id,
                kind="adjustment",
                qty_delta=opening,
                unit_cost=p.cost_price,
                reference_type="opening_stock",
                created_by=ctx.user.id,
            )
        )
    # Link earlier demand for this item so the evidence trail stays connected.
    keys = {normalize_item(p.name), *[normalize_item(a) for a in p.aliases]}
    for r in db.scalars(
        select(DemandRequest).where(DemandRequest.store_id == ctx.store.id, DemandRequest.normalized_item.in_(keys))
    ):
        r.product_id = p.id
    audit(
        db,
        ctx,
        "product.created",
        "product",
        p.id,
        f"Added {p.name}",
        {"cost_price": s_money(p.cost_price), "sell_price": s_money(p.sell_price)},
    )
    db.commit()
    return s_product(p)


@app.patch("/api/products/{product_id}")
def update_product(
    product_id: str, body: ProductPatch, ctx: StoreContext = Depends(require_owner), db: Session = Depends(get_db)
):
    p = _store_product(db, ctx, product_id)
    changes = body.model_dump(exclude_unset=True)
    before = {k: str(getattr(p, k)) for k in changes}
    for k, v in changes.items():
        setattr(p, k, v)
    audit(
        db,
        ctx,
        "product.updated",
        "product",
        p.id,
        f"Updated {p.name}",
        {"before": before, "after": {k: str(v) for k, v in changes.items()}},
    )
    db.commit()
    return s_product(p)


class AdjustIn(BaseModel):
    qty_delta: int = Field(ge=-100_000, le=100_000)
    kind: Literal["adjustment", "sale", "waste", "purchase"] = "adjustment"
    note: str = Field(default="", max_length=200)


@app.post("/api/products/{product_id}/adjust")
def adjust_stock(product_id: str, body: AdjustIn, ctx: StoreContext = Depends(store_context), db: Session = Depends(get_db)):
    p = _store_product(db, ctx, product_id)
    if body.qty_delta == 0:
        raise api_error(422, "INVALID_INPUT", "Change must not be zero.")
    if p.stock_qty + body.qty_delta < 0:
        raise api_error(422, "NEGATIVE_STOCK", f"Only {p.stock_qty} in stock.")
    p.stock_qty += body.qty_delta
    db.add(
        StockMovement(
            store_id=ctx.store.id,
            product_id=p.id,
            kind=body.kind,
            qty_delta=body.qty_delta,
            unit_cost=p.cost_price,
            reference_type="manual",
            created_by=ctx.user.id,
        )
    )
    audit(db, ctx, "stock.adjusted", "product", p.id, f"{p.name} stock {body.qty_delta:+d} ({body.kind})", {"note": body.note})
    db.commit()
    return s_product(p)


# ---------------------------------------------------------------- demand capture (Listen)

MAX_AUDIO_BYTES = 6 * 1024 * 1024
ALLOWED_AUDIO = {"audio/wav", "audio/x-wav", "audio/webm", "audio/ogg", "audio/mpeg", "audio/mp4", "audio/aac", "audio/flac"}


@app.post("/api/demand/extract")
async def extract_demand(
    text: str | None = Form(None),
    audio: UploadFile | None = File(None),
    language: str | None = Form(None, max_length=16),
    ctx: StoreContext = Depends(store_context),
    db: Session = Depends(get_db),
):
    """Turns a voice note or typed note into DRAFT requests. Nothing is saved until the merchant confirms."""
    if not text and not audio:
        raise api_error(422, "INVALID_INPUT", "Speak or type what the customer asked for.")
    blob, mime = None, "audio/wav"
    if audio is not None:
        mime = (audio.content_type or "").split(";")[0]
        if mime not in ALLOWED_AUDIO:
            raise api_error(415, "UNSUPPORTED_AUDIO", "This audio format is not supported. Please type instead.")
        blob = await audio.read()
        if len(blob) < 1000:
            raise api_error(422, "AUDIO_TOO_SHORT", "That recording was too short. Hold the mic and speak again.")
        if len(blob) > MAX_AUDIO_BYTES:
            raise api_error(413, "AUDIO_TOO_LARGE", "Recording is too long. Keep it under about a minute.")
    if text and len(text) > 2000:
        raise api_error(422, "INVALID_INPUT", "Note is too long (max 2000 characters).")
    products = db.scalars(select(Product).where(Product.store_id == ctx.store.id)).all()
    try:
        res = ai.extract_requests(
            mode=ctx.store.ai_mode or "auto",
            text=text,
            audio=blob,
            audio_mime=mime,
            catalog_names=[p.name for p in products],
            language_hint=(langs.get(language) or langs.get(ctx.store.language) or langs.REGISTRY["ta"]).code,
        )
    except ai.ProviderUnavailable as e:
        raise api_error(503, "PROVIDER_UNAVAILABLE", str(e)) from e
    for r in res.requests:
        p = match_product(r["normalized_item"], products) or match_product(r["raw_item"], products)
        r["product_id"] = p.id if p else None
        r["product_name"] = p.name if p else None
        r["in_stock_qty"] = p.stock_qty if p else None
    # Raw audio is never stored; only the transcript the merchant confirms is persisted.
    return {
        "transcript": res.transcript,
        "language": res.language,
        "english_gloss": res.english_gloss,
        "requests": res.requests,
        "extractor": res.extractor,
        "warning": res.warning,
        "source": "voice" if blob else "text",
    }


class DemandItemIn(BaseModel):
    raw_item: str = Field(min_length=1, max_length=200)
    normalized_item: str | None = Field(default=None, max_length=120)
    ask_count: int = Field(ge=1, le=500)
    reason: Literal["not_stocked", "out_of_stock", "variant_missing", "too_expensive", "unknown"] = "not_stocked"
    notes: str = Field(default="", max_length=500)
    product_id: str | None = None


class DemandBatchIn(BaseModel):
    items: list[DemandItemIn] = Field(min_length=1, max_length=20)
    transcript: str | None = Field(default=None, max_length=2000)
    language: str | None = Field(default=None, max_length=16)
    extractor: str | None = Field(default=None, max_length=60)
    requested_at: datetime | None = None


@app.post("/api/demand", status_code=201)
def create_demand(
    body: DemandBatchIn,
    ctx: StoreContext = Depends(store_context),
    db: Session = Depends(get_db),
    idempotency_key: str | None = Header(None),
):
    if (prev := idem_lookup(db, ctx, "demand.create", idempotency_key)) is not None:
        return prev
    products = db.scalars(select(Product).where(Product.store_id == ctx.store.id)).all()
    when = body.requested_at or utcnow()
    if when.tzinfo is None:
        when = when.replace(tzinfo=UTC)
    if when > utcnow() + timedelta(minutes=5):
        raise api_error(422, "INVALID_INPUT", "Request time cannot be in the future.")
    source = "ai_extracted_confirmed" if body.extractor and body.extractor != "manual" else "merchant_manual"
    saved = []
    for it in body.items:
        norm = normalize_item(it.normalized_item or it.raw_item)
        if not norm:
            raise api_error(422, "INVALID_INPUT", "Item name is empty.")
        pid = None
        if it.product_id:
            pid = _store_product(db, ctx, it.product_id).id
        elif m := match_product(norm, products):
            pid = m.id
        r = DemandRequest(
            store_id=ctx.store.id,
            raw_item=it.raw_item.strip(),
            normalized_item=norm,
            ask_count=it.ask_count,
            reason=it.reason,
            notes=it.notes,
            transcript=body.transcript,
            language=body.language,
            product_id=pid,
            source_type=source,
            extractor=body.extractor,
            requested_at=when,
            created_by=ctx.user.id,
        )
        db.add(r)
        db.flush()
        saved.append(r)
    audit(
        db,
        ctx,
        "demand.confirmed",
        "demand_request",
        saved[0].id,
        "Confirmed missed demand: " + ", ".join(f"{r.normalized_item} ×{r.ask_count}" for r in saved),
        {"source": source, "count": len(saved)},
    )
    out = {"saved": [s_request(r) for r in saved]}
    idem_save(db, ctx, "demand.create", idempotency_key, out)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        if (prev := idem_lookup(db, ctx, "demand.create", idempotency_key)) is not None:
            return prev
        raise
    return out


@app.get("/api/demand")
def list_demand(
    days: int = 30, include_dismissed: bool = False, ctx: StoreContext = Depends(store_context), db: Session = Depends(get_db)
):
    days = max(1, min(days, 365))
    q = select(DemandRequest).where(
        DemandRequest.store_id == ctx.store.id, DemandRequest.requested_at >= utcnow() - timedelta(days=days)
    )
    if not include_dismissed:
        q = q.where(DemandRequest.status == "confirmed")
    rows = db.scalars(q.order_by(DemandRequest.requested_at.desc()).limit(500)).all()
    return [s_request(r) for r in rows]


class DemandPatch(BaseModel):
    raw_item: str | None = Field(default=None, min_length=1, max_length=200)
    normalized_item: str | None = Field(default=None, min_length=1, max_length=120)
    ask_count: int | None = Field(default=None, ge=1, le=500)
    reason: Literal["not_stocked", "out_of_stock", "variant_missing", "too_expensive", "unknown"] | None = None
    status: Literal["confirmed", "dismissed"] | None = None


@app.patch("/api/demand/{request_id}")
def patch_demand(request_id: str, body: DemandPatch, ctx: StoreContext = Depends(store_context), db: Session = Depends(get_db)):
    r = db.get(DemandRequest, request_id)
    if not r or r.store_id != ctx.store.id:
        raise api_error(404, "NOT_FOUND", "Request not found.")
    changes = body.model_dump(exclude_unset=True)
    if "normalized_item" in changes:
        changes["normalized_item"] = normalize_item(changes["normalized_item"])
    before = {k: getattr(r, k) for k in changes}
    for k, v in changes.items():
        setattr(r, k, v)
    audit(
        db,
        ctx,
        "demand.corrected" if body.status != "dismissed" else "demand.dismissed",
        "demand_request",
        r.id,
        f"Edited request '{r.normalized_item}'",
        {"before": before, "after": changes},
    )
    db.commit()
    return s_request(r)


# ---------------------------------------------------------------- opportunities (Evaluate)


@app.get("/api/opportunities")
def list_opportunities(window: int = 7, ctx: StoreContext = Depends(store_context), db: Session = Depends(get_db)):
    window = max(1, min(window, 60))
    return {"window_days": window, "generated_at": utcnow().isoformat(), "items": compute_opportunities(db, ctx.store, window)}


@app.get("/api/opportunities/scenarios")
def opportunity_scenarios(item: str, qty: int, ctx: StoreContext = Depends(store_context), db: Session = Depends(get_db)):
    """Scenario grid for a merchant-chosen trial size (server-side Decimal maths; the UI never computes money)."""
    if not (1 <= qty <= 10_000):
        raise api_error(422, "INVALID_INPUT", "Quantity must be between 1 and 10,000.")
    products = db.scalars(select(Product).where(Product.store_id == ctx.store.id)).all()
    p = match_product(item, products)
    if not p or p.cost_price is None or p.sell_price is None:
        raise api_error(422, "NO_COST_BASIS", "Add buying and selling price to see scenarios.")
    return {
        "quantity": qty,
        "math_version": econ.MATH_VERSION,
        "scenarios": [s.as_dict() for s in econ.scenario_grid(qty, p.cost_price, p.sell_price)],
    }


class ExplainIn(BaseModel):
    item: str = Field(min_length=1, max_length=120)
    language: LangCode = "en"


@app.get("/api/languages")
def list_languages():
    """The 22 scheduled languages + English + code-mixes, with what works in the cloud and fully offline."""
    return {"languages": [lang.support() for lang in langs.LANGUAGES], "scheduled": 22}


@app.post("/api/opportunities/explain")
def explain_opportunity(body: ExplainIn, ctx: StoreContext = Depends(store_context), db: Session = Depends(get_db)):
    opp = next((o for o in compute_opportunities(db, ctx.store, 7) if o["item"] == normalize_item(body.item)), None)
    if not opp:
        raise api_error(404, "NOT_FOUND", "No recent demand for this item.")
    q = (
        "இந்த பொருளை சோதனையாக வாங்கலாமா? காரணங்களை எளிமையாக விளக்கு."
        if body.language == "ta"
        else "Should I try stocking this item? Explain the evidence, money and risk simply."
        + ("" if body.language == "en" else f" Reply in {langs.describe(body.language)}.")
    )
    data = {
        k: opp[k] for k in ("display_name", "status", "blockers", "evidence", "product", "margin_pct", "proposal", "scenarios")
    }
    try:
        text, model = ai.grounded_answer(q, {"store": ctx.store.name, "opportunity": data})
    except ai.ProviderUnavailable as e:
        raise api_error(503, "PROVIDER_UNAVAILABLE", f"{e}. The numbers on this page are still valid.") from e
    return {"explanation": text, "model": model, "grounded_on": opp["evidence"]["request_ids"]}


# ---------------------------------------------------------------- trials (Approve + Prove)


class TrialIn(BaseModel):
    item: str = Field(min_length=1, max_length=120)
    quantity: int = Field(ge=1, le=10_000)


def _store_trial(db: Session, ctx: StoreContext, trial_id: str) -> Trial:
    t = db.get(Trial, trial_id)
    if not t or t.store_id != ctx.store.id:
        raise api_error(404, "NOT_FOUND", "Trial not found.")
    return t


@app.post("/api/trials", status_code=201)
def propose_trial(body: TrialIn, ctx: StoreContext = Depends(store_context), db: Session = Depends(get_db)):
    item = normalize_item(body.item)
    opp = next((o for o in compute_opportunities(db, ctx.store, 7) if o["item"] == item), None)
    if not opp:
        raise api_error(404, "NOT_FOUND", "No confirmed demand for this item in the last 7 days.")
    if opp["open_trial_id"]:
        raise api_error(409, "TRIAL_EXISTS", "There is already an open trial for this item.")
    if not opp["product"] or opp["product"]["cost_price"] is None or opp["product"]["sell_price"] is None:
        raise api_error(422, "NO_COST_BASIS", "Add buying and selling price before proposing a trial.")
    if opp["status"] == "unprofitable":
        raise api_error(422, "UNPROFITABLE", "Selling price does not cover buying price.")
    p = db.get(Product, opp["product"]["id"])
    snapshot = {
        "math_version": econ.MATH_VERSION,
        "score": opp["score"],
        "score_version": opp["score_version"],
        "evidence": opp["evidence"],
        "recommended_qty": opp["proposal"]["quantity"],
        "reasons": opp["proposal"]["reasons"],
        "scenarios": [s.as_dict() for s in econ.scenario_grid(body.quantity, p.cost_price, p.sell_price)],
        "status_at_proposal": opp["status"],
        "captured_at": utcnow().isoformat(),
    }
    t = Trial(
        store_id=ctx.store.id,
        product_id=p.id,
        normalized_item=item,
        proposed_qty=body.quantity,
        unit_cost=p.cost_price,
        unit_price=p.sell_price,
        snapshot=snapshot,
        proposed_by=ctx.user.id,
    )
    db.add(t)
    db.flush()
    audit(
        db,
        ctx,
        "trial.proposed",
        "trial",
        t.id,
        f"Proposed trial: {body.quantity} × {p.name} (outlay ₹{econ.money(body.quantity * p.cost_price)})",
    )
    db.commit()
    return s_trial(t, db)


@app.get("/api/trials")
def list_trials(ctx: StoreContext = Depends(store_context), db: Session = Depends(get_db)):
    rows = db.scalars(select(Trial).where(Trial.store_id == ctx.store.id).order_by(Trial.created_at.desc())).all()
    return [s_trial(t, db) for t in rows]


@app.get("/api/trials/{trial_id}")
def get_trial(trial_id: str, ctx: StoreContext = Depends(store_context), db: Session = Depends(get_db)):
    return s_trial(_store_trial(db, ctx, trial_id), db)


class DecisionIn(BaseModel):
    quantity: int | None = Field(default=None, ge=1, le=10_000)
    note: str = Field(default="", max_length=300)


@app.post("/api/trials/{trial_id}/approve")
def approve_trial(trial_id: str, body: DecisionIn, ctx: StoreContext = Depends(require_owner), db: Session = Depends(get_db)):
    t = _store_trial(db, ctx, trial_id)
    if t.status != "pending_approval":
        raise api_error(409, "INVALID_STATE", f"Trial is already {t.status.replace('_', ' ')}.")
    p = db.get(Product, t.product_id)
    if p.cost_price != t.unit_cost or p.sell_price != t.unit_price:
        raise api_error(409, "PRICE_CHANGED", "Product prices changed since this proposal. Reject it and propose again.")
    if body.quantity and body.quantity != t.proposed_qty:
        t.snapshot = {
            **t.snapshot,
            "owner_edited_qty_from": t.proposed_qty,
            "scenarios": [s.as_dict() for s in econ.scenario_grid(body.quantity, t.unit_cost, t.unit_price)],
        }
        t.proposed_qty = body.quantity
    t.status, t.decided_by, t.decided_at, t.decision_note = "approved", ctx.user.id, utcnow(), body.note
    audit(
        db,
        ctx,
        "trial.approved",
        "trial",
        t.id,
        f"Approved {t.proposed_qty} × {p.name}, planned outlay ₹{econ.money(t.proposed_qty * t.unit_cost)}",
    )
    db.commit()
    return s_trial(t, db)


@app.post("/api/trials/{trial_id}/reject")
def reject_trial(trial_id: str, body: DecisionIn, ctx: StoreContext = Depends(require_owner), db: Session = Depends(get_db)):
    t = _store_trial(db, ctx, trial_id)
    if t.status not in ("pending_approval", "approved"):
        raise api_error(409, "INVALID_STATE", f"Trial is already {t.status.replace('_', ' ')}.")
    t.status = "rejected" if t.status == "pending_approval" else "cancelled"
    t.decided_by, t.decided_at, t.decision_note = ctx.user.id, utcnow(), body.note
    audit(db, ctx, f"trial.{t.status}", "trial", t.id, f"Trial {t.status}: {t.normalized_item}", {"note": body.note})
    db.commit()
    return s_trial(t, db)


class ReceiveIn(BaseModel):
    received_qty: int = Field(ge=1, le=10_000)
    unit_cost: Decimal | None = Field(default=None, ge=0, max_digits=12, decimal_places=2)


@app.post("/api/trials/{trial_id}/receive")
def receive_trial(trial_id: str, body: ReceiveIn, ctx: StoreContext = Depends(store_context), db: Session = Depends(get_db)):
    t = _store_trial(db, ctx, trial_id)
    if t.status != "approved":
        raise api_error(409, "INVALID_STATE", "Only an approved trial can be received.")
    p = db.get(Product, t.product_id)
    t.received_qty = body.received_qty
    t.actual_unit_cost = body.unit_cost if body.unit_cost is not None else t.unit_cost
    t.status = "active"
    p.stock_qty += body.received_qty
    db.add(
        StockMovement(
            store_id=ctx.store.id,
            product_id=p.id,
            kind="purchase",
            qty_delta=body.received_qty,
            unit_cost=t.actual_unit_cost,
            reference_type="trial",
            reference_id=t.id,
            created_by=ctx.user.id,
        )
    )
    audit(
        db,
        ctx,
        "trial.received",
        "trial",
        t.id,
        f"Received {body.received_qty} × {p.name} at ₹{econ.money(t.actual_unit_cost)} (outlay ₹{econ.money(body.received_qty * t.actual_unit_cost)})",
    )
    db.commit()
    return s_trial(t, db)


class OutcomeIn(BaseModel):
    sold_qty: int = Field(ge=0, le=10_000)
    wasted_qty: int = Field(default=0, ge=0, le=10_000)
    unit_price: Decimal | None = Field(default=None, ge=0, max_digits=12, decimal_places=2)


@app.post("/api/trials/{trial_id}/outcome")
def record_outcome(
    trial_id: str,
    body: OutcomeIn,
    ctx: StoreContext = Depends(store_context),
    db: Session = Depends(get_db),
    idempotency_key: str | None = Header(None),
):
    if (prev := idem_lookup(db, ctx, f"trial.outcome:{trial_id}", idempotency_key)) is not None:
        return prev
    t = _store_trial(db, ctx, trial_id)
    if t.status != "active":
        raise api_error(409, "INVALID_STATE", "Receive the stock before recording results.")
    if body.sold_qty + body.wasted_qty > (t.received_qty or 0):
        raise api_error(422, "INVALID_INPUT", f"Sold + wasted cannot exceed {t.received_qty} received.")
    p = db.get(Product, t.product_id)
    if p.stock_qty < body.sold_qty + body.wasted_qty:
        raise api_error(422, "NEGATIVE_STOCK", f"Only {p.stock_qty} {p.unit} left in stock records.")
    t.sold_qty, t.wasted_qty = body.sold_qty, body.wasted_qty
    t.actual_unit_price = body.unit_price if body.unit_price is not None else t.unit_price
    t.status, t.completed_at = "completed", utcnow()
    for kind, q in (("sale", body.sold_qty), ("waste", body.wasted_qty)):
        if q:
            p.stock_qty -= q
            db.add(
                StockMovement(
                    store_id=ctx.store.id,
                    product_id=p.id,
                    kind=kind,
                    qty_delta=-q,
                    unit_cost=t.actual_unit_cost,
                    reference_type="trial",
                    reference_id=t.id,
                    created_by=ctx.user.id,
                )
            )
    out = s_trial(t, db)
    audit(
        db,
        ctx,
        "trial.completed",
        "trial",
        t.id,
        f"Result: {body.sold_qty} sold, {body.wasted_qty} wasted. Gross profit ₹{out['result']['gross_profit']}",
        {"result": out["result"]},
    )
    idem_save(db, ctx, f"trial.outcome:{trial_id}", idempotency_key, out)
    db.commit()
    return out


class SupplierMsgIn(BaseModel):
    language: LangCode = "ta"


@app.post("/api/trials/{trial_id}/supplier-message")
def supplier_message(
    trial_id: str, body: SupplierMsgIn, ctx: StoreContext = Depends(require_owner), db: Session = Depends(get_db)
):
    t = _store_trial(db, ctx, trial_id)
    if t.status not in ("approved", "active"):
        raise api_error(409, "ACTION_REQUIRES_APPROVAL", "Approve the trial before contacting a supplier.")
    p = db.get(Product, t.product_id)
    text, model = ai.supplier_message(
        {
            "item": p.name,
            "quantity": t.proposed_qty,
            "unit": p.unit,
            "store_name": ctx.store.name,
            "supplier_name": p.supplier_name or "",
        },
        body.language,
    )
    audit(
        db, ctx, "supplier.message_drafted", "trial", t.id, f"Drafted supplier message for {p.name} (not sent)", {"model": model}
    )
    db.commit()
    return {
        "text": text,
        "model": model,
        "sent": False,
        "note": "MITRA never sends messages. Review the text and send it yourself.",
    }


# ---------------------------------------------------------------- dashboard, ask, activity


def _store_summary(db: Session, ctx: StoreContext) -> dict:
    now = utcnow()
    week = db.scalars(
        select(DemandRequest).where(
            DemandRequest.store_id == ctx.store.id,
            DemandRequest.status == "confirmed",
            DemandRequest.requested_at >= now - timedelta(days=7),
        )
    ).all()
    by_item = Counter()
    for r in week:
        by_item[r.normalized_item] += r.ask_count
    trials = db.scalars(select(Trial).where(Trial.store_id == ctx.store.id)).all()
    products = db.scalars(select(Product).where(Product.store_id == ctx.store.id)).all()
    opps = compute_opportunities(db, ctx.store, 7)
    completed = [s_trial(t, db) for t in trials if t.status == "completed"]
    return {
        "store": {"name": ctx.store.name, "city": ctx.store.city},
        "asks_last_7_days_by_item": dict(by_item.most_common(15)),
        "opportunities": [
            {
                "item": o["display_name"],
                "score": o["score"],
                "status": o["status"],
                "asks": o["evidence"]["ask_total"],
                "days": o["evidence"]["distinct_days"],
                "proposed_trial_qty": o["proposal"]["quantity"],
                "margin_pct": o["margin_pct"],
                "scenarios": o["scenarios"],
                "blockers": o["blockers"],
            }
            for o in opps[:8]
        ],
        "trials": [{"item": t.normalized_item, "status": t.status, "qty": t.proposed_qty} for t in trials][:20],
        "completed_trial_results": [{"item": c["product_name"], **c["result"]} for c in completed][:10],
        "catalog": [
            {"name": p.name, "stock": p.stock_qty, "cost": s_money(p.cost_price), "price": s_money(p.sell_price)}
            for p in products
        ][:60],
    }


@app.get("/api/dashboard")
def dashboard(ctx: StoreContext = Depends(store_context), db: Session = Depends(get_db)):
    now = utcnow()
    rows = db.scalars(
        select(DemandRequest).where(
            DemandRequest.store_id == ctx.store.id,
            DemandRequest.status == "confirmed",
            DemandRequest.requested_at >= now - timedelta(days=14),
        )
    ).all()
    ist = timezone(timedelta(hours=5, minutes=30))
    daily: dict[str, int] = defaultdict(int)
    for r in rows:
        rt = r.requested_at if r.requested_at.tzinfo else r.requested_at.replace(tzinfo=UTC)
        daily[rt.astimezone(ist).date().isoformat()] += r.ask_count
    today = now.astimezone(ist).date()
    series = [
        {"date": (today - timedelta(days=i)).isoformat(), "asks": daily.get((today - timedelta(days=i)).isoformat(), 0)}
        for i in range(13, -1, -1)
    ]
    week_rows = [
        r
        for r in rows
        if (r.requested_at if r.requested_at.tzinfo else r.requested_at.replace(tzinfo=UTC)) >= now - timedelta(days=7)
    ]
    opps = compute_opportunities(db, ctx.store, 7)
    trials = db.scalars(select(Trial).where(Trial.store_id == ctx.store.id)).all()
    completed = [s_trial(t, db) for t in trials if t.status == "completed"]
    gp = sum((Decimal(c["result"]["gross_profit_after_waste"]) for c in completed), Decimal(0))
    attention = []
    for t in trials:
        if t.status == "pending_approval":
            attention.append({"kind": "approval", "trial_id": t.id, "item": t.normalized_item, "qty": t.proposed_qty})
        elif t.status == "approved":
            attention.append({"kind": "receive", "trial_id": t.id, "item": t.normalized_item, "qty": t.proposed_qty})
        elif t.status == "active":
            attention.append({"kind": "outcome", "trial_id": t.id, "item": t.normalized_item, "qty": t.received_qty})
    for o in opps[:5]:
        if o["status"] == "ready" and not o["open_trial_id"]:
            attention.append(
                {
                    "kind": "opportunity",
                    "item": o["item"],
                    "display_name": o["display_name"],
                    "score": o["score"],
                    "asks": o["evidence"]["ask_total"],
                    "qty": o["proposal"]["quantity"],
                }
            )
        elif o["status"] == "needs_cost" and o["evidence"]["ask_total"] >= 3:
            attention.append(
                {"kind": "needs_cost", "item": o["item"], "display_name": o["display_name"], "asks": o["evidence"]["ask_total"]}
            )
    return {
        "store": s_store(ctx.store, ctx.role),
        "kpis": {
            "asks_7d": sum(r.ask_count for r in week_rows),
            "items_7d": len({r.normalized_item for r in week_rows}),
            "ready_opportunities": sum(1 for o in opps if o["status"] == "ready"),
            "open_trials": sum(1 for t in trials if t.status in ("pending_approval", "approved", "active")),
            "completed_trials": len(completed),
            "realized_gross_profit": s_money(gp),
        },
        "series": series,
        "top_items": Counter({o["display_name"]: o["evidence"]["ask_total"] for o in opps}).most_common(6),
        "attention": attention[:8],
        "sample_data_present": any(r.source_type == "sample_seed" for r in rows),
        "ai_available": ai.ai_available(),
    }


class AskIn(BaseModel):
    question: str = Field(min_length=2, max_length=500)


@app.post("/api/ask")
def ask(body: AskIn, ctx: StoreContext = Depends(store_context), db: Session = Depends(get_db)):
    summary = _store_summary(db, ctx)
    try:
        text, model = ai.grounded_answer(body.question, summary)
    except ai.ProviderUnavailable:
        top = list(summary["asks_last_7_days_by_item"].items())[:3]
        text = (
            ("Top asked items this week: " + ", ".join(f"{k} ({v} asks)" for k, v in top))
            if top
            else "No missed requests recorded this week."
        )
        model = "rules-v1"
    audit(db, ctx, "assistant.asked", "assistant", None, "Asked MITRA a question", {"model": model})
    db.commit()
    return {"answer": text, "model": model, "grounded_on": ["demand_requests (7d)", "products", "trials"]}


@app.get("/api/activity")
def activity(ctx: StoreContext = Depends(store_context), db: Session = Depends(get_db)):
    rows = db.execute(
        select(AuditEvent, User.name)
        .outerjoin(User, User.id == AuditEvent.actor_id)
        .where(AuditEvent.store_id == ctx.store.id)
        .order_by(AuditEvent.created_at.desc())
        .limit(200)
    ).all()
    return [
        {
            "id": e.id,
            "action": e.action,
            "entity_type": e.entity_type,
            "entity_id": e.entity_id,
            "summary": e.summary,
            "actor": name,
            "created_at": iso(e.created_at),
        }
        for e, name in rows
    ]


from .preorders import router as preorder_router  # noqa: E402

app.include_router(preorder_router)

from .growth import router as growth_router  # noqa: E402

app.include_router(growth_router)
