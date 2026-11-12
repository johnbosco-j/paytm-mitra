from decimal import Decimal

import pytest

from app import economics as econ


def test_golden_trial_result_matches_spec():
    """docs/04 §5: 16 bought @ ₹22, 14 sold @ ₹35."""
    r = econ.realized_result(received=16, sold=14, wasted=0, unit_cost=Decimal("22"), unit_price=Decimal("35"))
    assert r.purchase_outlay == Decimal("352.00")
    assert r.revenue == Decimal("490.00")
    assert r.cogs == Decimal("308.00")
    assert r.gross_profit == Decimal("182.00")
    assert r.cash_difference == Decimal("138.00")  # cash, not profit
    assert r.leftover_qty == 2
    assert r.leftover_value == Decimal("44.00")
    assert r.sell_through_pct == Decimal("87.5")


def test_waste_is_written_off_separately():
    r = econ.realized_result(16, 12, 2, Decimal("22"), Decimal("35"))
    assert r.gross_profit == Decimal("156.00")
    assert r.waste_writeoff == Decimal("44.00")
    assert r.gross_profit_after_waste == Decimal("112.00")
    assert r.leftover_qty == 2


def test_24_asks_propose_16_not_24():
    s = econ.propose_trial_quantity(asks_in_window=24, window_days=7)
    assert s.quantity == 16
    assert any("not guaranteed" in reason for reason in s.reasons)


def test_shelf_life_caps_quantity():
    s = econ.propose_trial_quantity(asks_in_window=28, window_days=7, shelf_life_days=2)
    assert s.quantity == 8  # 4/day x 2 days


def test_budget_and_stock_caps():
    s = econ.propose_trial_quantity(24, 7, stock_on_hand=4, unit_cost=Decimal("22"), budget=Decimal("200"))
    assert s.quantity == 9  # 16 - 4 = 12, then budget 200 // 22 = 9


def test_scenario_grid_cautious_likely_best():
    grid = econ.scenario_grid(16, Decimal("22"), Decimal("35"))
    assert [g.units_sold for g in grid] == [8, 12, 16]
    assert grid[0].gross_profit == Decimal("104.00")
    assert grid[0].cash_difference == Decimal("-72.00")  # cautious case still has cash tied in stock
    assert grid[-1].purchase_outlay == Decimal("352.00")


@pytest.mark.parametrize(
    "kwargs",
    [
        dict(received=5, sold=4, wasted=2, unit_cost=Decimal(1), unit_price=Decimal(2)),
        dict(received=5, sold=-1, wasted=0, unit_cost=Decimal(1), unit_price=Decimal(2)),
        dict(received=5, sold=1, wasted=0, unit_cost=Decimal(-1), unit_price=Decimal(2)),
    ],
)
def test_invalid_inputs_rejected(kwargs):
    with pytest.raises(econ.EconomicsError):
        econ.realized_result(**kwargs)


def test_paise_rounding_is_half_up():
    assert econ.money(Decimal("10.005")) == Decimal("10.01")
    r = econ.scenario(3, 3, Decimal("33.33"), Decimal("49.99"))
    assert r.revenue == Decimal("149.97") and r.cogs == Decimal("99.99")
