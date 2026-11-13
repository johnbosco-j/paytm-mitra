"""Seed a SAMPLE demo store (all demand rows are labeled source_type='sample_seed' and shown with a SAMPLE badge).

Usage:  .venv/bin/python seed_demo.py          (idempotent: wipes and recreates only the demo accounts' store)

Demo logins (local/test only):
  owner  demo.owner@mitra.test / mitra-demo-2026
  staff  demo.staff@mitra.test / mitra-demo-2026
"""

from datetime import UTC, datetime, timedelta, timezone
from decimal import Decimal

from sqlalchemy import delete, select

from app.db import SessionLocal
from app.models import (
    AuditEvent,
    DemandRequest,
    Expense,
    IdempotencyRecord,
    Membership,
    PreOrder,
    Product,
    Sale,
    StockMovement,
    Store,
    Trial,
    User,
)
from app.security import hash_password

OWNER = ("demo.owner@mitra.test", "Joe Naren A")
STAFF = ("demo.staff@mitra.test", "Ravi (staff)")
PASSWORD = "mitra-demo-2026"  # local demo only
IST = timezone(timedelta(hours=5, minutes=30))

PRODUCTS = [
    # name, aliases, category, unit, cost, price, stock, shelf_life, supplier
    ("Mango Lassi 200ml", ["mango lassi", "lassi", "மாம்பழ லஸ்ஸி"], "beverages", "bottle", "22", "35", 0, 5, "Sri Balaji Dairy"),
    ("Amul Butter 100g", ["amul butter", "butter", "வெண்ணெய்"], "dairy", "pack", "52", "58", 0, 30, "Ganesh Agencies"),
    ("Aavin Milk 500ml", ["aavin milk", "milk", "பால்"], "dairy", "pouch", "21", "24", 30, 2, "Aavin booth"),
    ("Parle-G 100g", ["parle g", "biscuit"], "snacks", "pack", "8", "10", 60, 180, "Ganesh Agencies"),
    ("Bovonto 600ml", ["bovonto"], "beverages", "bottle", "28", "40", 12, 120, "Kalimark distributor"),
    ("Filter Coffee Powder 200g", ["coffee powder", "filter coffee"], "staples", "pack", "95", "120", 0, 90, None),
]

# item, ask counts per day offset (0 = today ... 6 = six days ago), reason
DEMAND = [
    ("mango lassi", {1: 3, 2: 4, 3: 2, 4: 3, 5: 2, 6: 2}, "not_stocked"),  # 16 seeded; demo adds 8 live -> 24
    ("amul butter 100g", {0: 1, 1: 2, 3: 2, 4: 1, 6: 1}, "out_of_stock"),
    ("rose milk", {1: 2, 2: 1, 4: 2, 5: 1}, "not_stocked"),  # no product -> "needs cost"
    ("filter coffee powder 200g", {2: 1, 5: 1}, "out_of_stock"),  # too little evidence
    ("bovonto 600ml", {3: 1}, "variant_missing"),
]


def run() -> None:
    db = SessionLocal()
    try:
        users = {}
        for email, name in (OWNER, STAFF):
            u = db.scalar(select(User).where(User.email == email))
            if not u:
                u = User(email=email, name=name, password_hash=hash_password(PASSWORD))
                db.add(u)
                db.flush()
            u.name = name  # keep demo names current when the story's cast changes
            users[email] = u
        owner, staff = users[OWNER[0]], users[STAFF[0]]
        # remove previous demo store(s) owned by the demo owner
        for m in db.scalars(select(Membership).where(Membership.user_id == owner.id, Membership.role == "owner")).all():
            sid = m.store_id
            for model in (AuditEvent, StockMovement, DemandRequest, Trial, IdempotencyRecord, Sale, Expense, PreOrder):
                db.execute(delete(model).where(model.store_id == sid))
            db.execute(delete(Product).where(Product.store_id == sid))
            db.execute(delete(Membership).where(Membership.store_id == sid))
            db.execute(delete(Store).where(Store.id == sid))
        db.flush()

        store = Store(
            name="Naren Stores", city="Velachery, Chennai", category="kirana", language="ta", trial_budget=Decimal("2000")
        )
        db.add(store)
        db.flush()
        db.add_all(
            [
                Membership(store_id=store.id, user_id=owner.id, role="owner"),
                Membership(store_id=store.id, user_id=staff.id, role="staff"),
            ]
        )
        products = {}
        for name, aliases, cat, unit, cost, price, stock, shelf, supplier in PRODUCTS:
            p = Product(
                store_id=store.id,
                name=name,
                aliases=aliases,
                category=cat,
                unit=unit,
                cost_price=Decimal(cost),
                sell_price=Decimal(price),
                stock_qty=stock,
                shelf_life_days=shelf,
                supplier_name=supplier,
                source_type="sample_seed",
            )
            db.add(p)
            db.flush()
            products[name.lower()] = p
            if stock:
                db.add(
                    StockMovement(
                        store_id=store.id,
                        product_id=p.id,
                        kind="adjustment",
                        qty_delta=stock,
                        unit_cost=p.cost_price,
                        reference_type="opening_stock",
                        created_by=owner.id,
                    )
                )
        today = datetime.now(IST).replace(hour=0, minute=0, second=0, microsecond=0)
        for item, per_day, reason in DEMAND:
            pid = next(
                (p.id for p in products.values() if item in [a.lower() for a in p.aliases] or item == p.name.lower()), None
            )
            for offset, count in per_day.items():
                for i in range(count):
                    when = today - timedelta(days=offset) + timedelta(hours=10 + (i * 3) % 10, minutes=7 * i)
                    if when > datetime.now(IST):
                        when = datetime.now(IST) - timedelta(minutes=30 + i)
                    db.add(
                        DemandRequest(
                            store_id=store.id,
                            raw_item=item,
                            normalized_item=item,
                            ask_count=1,
                            reason=reason,
                            product_id=pid,
                            source_type="sample_seed",
                            extractor="seed",
                            requested_at=when.astimezone(UTC),
                            created_by=staff.id if i % 2 else owner.id,
                        )
                    )
        # 60 days of SAMPLE sales: weekday rhythm, mild growth, ~70 repeat payers (some drifting away), UPI + cash
        import hashlib
        import random

        rng = random.Random(15)
        payers = [f"sample{i}@upi" for i in range(70)]
        drifting = set(payers[:9])  # regulars who stopped coming about 3 weeks ago
        weekday_mult = [0.9, 0.85, 0.9, 0.95, 1.1, 1.35, 1.3]
        for day in range(60, 0, -1):
            d = today - timedelta(days=day)
            n = int(rng.gauss(46, 6) * weekday_mult[d.weekday()] * (1 + (60 - day) * 0.003))
            for k in range(max(n, 10)):
                when = d + timedelta(hours=rng.choice([7, 8, 9, 10, 11, 12, 13, 17, 18, 19, 20, 21]), minutes=rng.randint(0, 59))
                payer = rng.choice(payers) if rng.random() < 0.72 else None
                if payer in drifting and day < 22:
                    payer = rng.choice(payers[9:])
                method = "upi" if payer else ("cash" if rng.random() < 0.8 else "card")
                amt = Decimal(str(round(max(10, rng.lognormvariate(4.1, 0.6)), 0)))
                db.add(
                    Sale(
                        store_id=store.id,
                        occurred_at=when.astimezone(UTC),
                        amount=amt,
                        method=method,
                        payer_hash=hashlib.sha256(f"{store.id}:{payer}".encode()).hexdigest()[:16] if payer else None,
                        external_ref=f"sample-{day}-{k}",
                        source_type="sample_seed",
                        created_by=owner.id,
                    )
                )
        first = (today.replace(day=1) + timedelta(days=32)).replace(day=1)
        # stock purchases are already netted by the margin, so only overheads go here
        for name, amt, cad, due in (
            ("Shop rent", "8500", "monthly", first),
            ("Electricity", "1600", "monthly", today + timedelta(days=9)),
            ("Helper salary", "7000", "monthly", first + timedelta(days=4)),
            ("Phone + internet", "450", "monthly", today + timedelta(days=12)),
        ):
            db.add(Expense(store_id=store.id, name=name, amount=Decimal(amt), cadence=cad, next_due=due.astimezone(UTC)))
        store.cash_on_hand = Decimal("2600")
        store.avg_margin_pct = Decimal("18")
        db.add(
            AuditEvent(
                store_id=store.id,
                actor_id=owner.id,
                action="store.seeded",
                entity_type="store",
                entity_id=store.id,
                summary="SAMPLE data loaded for demo (labeled sample_seed)",
            )
        )
        db.commit()
        print(f"Seeded SAMPLE store {store.name} ({store.id}). Owner {OWNER[0]}, staff {STAFF[0]}; password in this file.")
    finally:
        db.close()


if __name__ == "__main__":
    run()
