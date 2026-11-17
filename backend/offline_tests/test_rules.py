"""Exercise real deterministic rules using existing synthetic test builders."""
import pytest
from app.detection import engine as E
from app.services.scoring import priority_score, priority_level, parcel_status, txn_status
from tests.conftest import make_ctx, tx, reg, mut


def test_consistent_transaction_has_no_signals_or_evidence():
    ctx = make_ctx([tx("T-000001", "A", "B")], [reg("T-000001", "A", "B")], [mut("T-000001", "A", "B")])
    result = E.run_rules(ctx)
    assert result[E.SIGNALS].iloc[0].eq(0).all()
    assert result.iloc[0].signal_count == 0
    assert result.iloc[0].rule_points == 0
    assert E.build_evidence(ctx.iloc[0], result.iloc[0]) == []


def test_double_sale_has_reference_and_explanation():
    ctx = make_ctx([tx("T-000001", "A", "B"), tx("T-000002", "A", "C", "2021-01-01", seq=2, days=366)])
    result = E.run_rules(ctx)
    assert result.double_sale.tolist() == [0, 1]
    evidence = E.build_evidence(ctx.iloc[1], result.iloc[1], lookup=ctx.set_index("transaction_id"))
    item = next(e for e in evidence if e["type"] == "double_sale")
    assert "T-000001" in item["message"]
    assert item["details"]["Earlier full transfer"] == "T-000001"


@pytest.mark.parametrize("record,field,value,signal", [
    ("registration", "buyer_id", "OTHER", "registration_mismatch"),
    ("registration", "registered_area_decimal", 7, "registration_mismatch"),
    ("mutation", "new_owner_id", "OTHER", "mutation_mismatch"),
    ("mutation", "mutated_area_decimal", 7, "mutation_mismatch"),
])
def test_record_mismatch_emits_corresponding_evidence(record, field, value, signal):
    r, m = reg("T-000001", "A", "B"), mut("T-000001", "A", "B")
    (r if record == "registration" else m)[field] = value
    ctx = make_ctx([tx("T-000001", "A", "B")], [r], [m])
    result = E.run_rules(ctx)
    assert result.iloc[0][signal] == 1
    assert signal in {e["type"] for e in E.build_evidence(ctx.iloc[0], result.iloc[0])}


@pytest.mark.parametrize("points", [0, 15, 30, 60, 70, 100, 500])
@pytest.mark.parametrize("ml", [-1, 0, 0.5, 1, 5])
def test_score_is_bounded_for_rule_outputs(points, ml):
    score = priority_score(points, ml)
    assert 0 <= score <= 100
    expected = min(70, points) + 30 * min(1, max(0, ml))
    assert score == round(expected, 1)
    level = "Critical" if score >= 80 else "High" if score >= 60 else "Medium" if score >= 30 else "Low"
    assert priority_level(score) == level


@pytest.mark.parametrize("score,level,status", [
    (0, "Low", "Consistent"), (29.9, "Low", "Consistent"),
    (30, "Medium", "Review Required"), (59.9, "Medium", "Review Required"),
    (60, "High", "High Concern"), (79.9, "High", "High Concern"),
    (80, "Critical", "High Concern"), (100, "Critical", "High Concern"),
])
def test_priority_boundaries_and_display_status(score, level, status):
    assert priority_level(score) == level
    assert parcel_status(level) == txn_status(level) == status
