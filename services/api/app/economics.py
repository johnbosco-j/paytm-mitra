"""Deterministic merchant economics. Pure functions, Decimal only, no LLM involvement.

Glossary (see docs/04 §5):
- purchase outlay   = units bought x unit cost (cash leaving the till)
- revenue           = units sold x unit price
- COGS              = units sold x unit cost
- gross profit      = revenue - COGS (on units actually sold, before other costs)
- cash difference   = revenue - purchase outlay (NOT profit)
- leftover value    = usable unsold units x unit cost (inventory asset, not cash)
- waste write-off   = wasted units x unit cost
"""

from __future__ import annotations

import math
from dataclasses import asdict, dataclass
from decimal import ROUND_HALF_UP, Decimal

TWO_PLACES = Decimal("0.01")
MATH_VERSION = "econ-v1"
# Requests are not sales. Default planning conversion for the first trial (a product heuristic, not measured).
DEFAULT_TRIAL_FRACTION = Decimal(2) / Decimal(3)


class EconomicsError(ValueError):
    pass


def money(value) -> Decimal:
    d = value if isinstance(value, Decimal) else Decimal(str(value))
    return d.quantize(TWO_PLACES, rounding=ROUND_HALF_UP)


def _check_non_negative(**values) -> None:
    for name, v in values.items():
        if v is None:
            raise EconomicsError(f"{name} is required")
        if v < 0:
            raise EconomicsError(f"{name} cannot be negative")


@dataclass(frozen=True)
class Scenario:
    label: str
    units_sold: int
    revenue: Decimal
    cogs: Decimal
    gross_profit: Decimal
    purchase_outlay: Decimal
    cash_difference: Decimal
    leftover_units: int
    leftover_value: Decimal
    profit_if_leftover_spoils: Decimal

    def as_dict(self) -> dict:
        return {k: (str(v) if isinstance(v, Decimal) else v) for k, v in asdict(self).items()}


def scenario(qty: int, sold: int, unit_cost: Decimal, unit_price: Decimal, label: str = "") -> Scenario:
    _check_non_negative(qty=qty, sold=sold, unit_cost=unit_cost, unit_price=unit_price)
    if sold > qty:
        raise EconomicsError("units sold cannot exceed units bought")
    outlay = money(Decimal(qty) * unit_cost)
    revenue = money(Decimal(sold) * unit_price)
    cogs = money(Decimal(sold) * unit_cost)
    leftover = qty - sold
    leftover_value = money(Decimal(leftover) * unit_cost)
    return Scenario(
        label=label or f"{sold} sold",
        units_sold=sold,
        revenue=revenue,
        cogs=cogs,
        gross_profit=money(revenue - cogs),
        purchase_outlay=outlay,
        cash_difference=money(revenue - outlay),
        leftover_units=leftover,
        leftover_value=leftover_value,
        profit_if_leftover_spoils=money(revenue - outlay),
    )


def scenario_grid(qty: int, unit_cost: Decimal, unit_price: Decimal) -> list[Scenario]:
    """Cautious, likely and best cases at 50% / 75% / 100% sell-through of the trial quantity."""
    if qty <= 0:
        return []
    points = sorted({max(0, math.floor(qty * f)) for f in (0.5, 0.75, 1.0)})
    labels = {points[0]: "cautious", points[-1]: "best case"}
    return [scenario(qty, s, unit_cost, unit_price, labels.get(s, "likely")) for s in points]


@dataclass(frozen=True)
class TrialSizing:
    quantity: int
    reasons: list[str]


def propose_trial_quantity(
    asks_in_window: int,
    window_days: int,
    stock_on_hand: int = 0,
    shelf_life_days: int | None = None,
    unit_cost: Decimal | None = None,
    budget: Decimal | None = None,
) -> TrialSizing:
    """Size a reversible first trial. 24 asks/week -> 16 units, never 'buy 24 because 24 asked'."""
    if asks_in_window <= 0 or window_days <= 0:
        return TrialSizing(0, ["No confirmed customer asks in this window."])
    weekly = Decimal(asks_in_window) * Decimal(7) / Decimal(window_days)
    qty = math.ceil(weekly * DEFAULT_TRIAL_FRACTION - Decimal("1e-9"))
    reasons = [
        f"{asks_in_window} confirmed asks in {window_days} days (≈{weekly.quantize(Decimal('0.1'))}/week).",
        "Asks are not guaranteed sales, so the first trial covers about two-thirds of weekly asks.",
    ]
    if shelf_life_days is not None and shelf_life_days > 0:
        daily = weekly / Decimal(7)
        shelf_cap = max(1, math.ceil(daily * shelf_life_days))
        if shelf_cap < qty:
            qty = shelf_cap
            reasons.append(f"Capped at {shelf_cap}: shelf life is {shelf_life_days} days at the current ask rate.")
    if stock_on_hand > 0:
        qty = max(0, qty - stock_on_hand)
        reasons.append(f"Reduced by {stock_on_hand} units already in stock.")
    if budget is not None and unit_cost is not None and unit_cost > 0:
        budget_cap = int(budget // unit_cost)
        if budget_cap < qty:
            qty = budget_cap
            reasons.append(f"Capped at {budget_cap} by the store's trial budget of ₹{money(budget)}.")
    return TrialSizing(max(qty, 0), reasons)


@dataclass(frozen=True)
class RealizedResult:
    received_qty: int
    sold_qty: int
    wasted_qty: int
    leftover_qty: int
    purchase_outlay: Decimal
    revenue: Decimal
    cogs: Decimal
    gross_profit: Decimal
    waste_writeoff: Decimal
    gross_profit_after_waste: Decimal
    cash_difference: Decimal
    leftover_value: Decimal
    sell_through_pct: Decimal

    def as_dict(self) -> dict:
        return {k: (str(v) if isinstance(v, Decimal) else v) for k, v in asdict(self).items()}


def realized_result(received: int, sold: int, wasted: int, unit_cost: Decimal, unit_price: Decimal) -> RealizedResult:
    _check_non_negative(received=received, sold=sold, wasted=wasted, unit_cost=unit_cost, unit_price=unit_price)
    if sold + wasted > received:
        raise EconomicsError("sold + wasted cannot exceed units received")
    outlay = money(Decimal(received) * unit_cost)
    revenue = money(Decimal(sold) * unit_price)
    cogs = money(Decimal(sold) * unit_cost)
    gross = money(revenue - cogs)
    waste = money(Decimal(wasted) * unit_cost)
    leftover = received - sold - wasted
    pct = (Decimal(sold) * 100 / Decimal(received)).quantize(Decimal("0.1")) if received else Decimal("0.0")
    return RealizedResult(
        received_qty=received,
        sold_qty=sold,
        wasted_qty=wasted,
        leftover_qty=leftover,
        purchase_outlay=outlay,
        revenue=revenue,
        cogs=cogs,
        gross_profit=gross,
        waste_writeoff=waste,
        gross_profit_after_waste=money(gross - waste),
        cash_difference=money(revenue - outlay),
        leftover_value=money(Decimal(leftover) * unit_cost),
        sell_through_pct=pct,
    )
