import pytest
from app.services.document_verification import extract_document, MAX_BYTES


def test_health_and_unfiltered_search(client):
    health = client.get("/api/health")
    assert health.status_code == 200
    assert health.json()["database"] is True
    assert health.json()["analysis_ready"] is False
    result = client.get("/api/parcels").json()
    assert result["total"] == 1
    assert result["items"][0]["parcel_id"] == "P-000001"
    assert result["items"][0]["integrity_status"] == "No transactions"
    assert client.get("/api/parcels", params={"district": "Absent"}).json()["items"] == []
    assert client.get("/api/parcels", params={"offset": 1}).json()["items"] == []


@pytest.mark.parametrize("path", [
    "/api/parcels?limit=0", "/api/parcels?limit=101", "/api/parcels?offset=-1",
    "/api/parcels?integrity_status=Unknown", "/api/parcels/not-an-id",
    "/api/alerts?type=invalid", "/api/ownership/history",
])
def test_api_validation(client, path):
    assert client.get(path).status_code == 422


def test_missing_parcel(client):
    response = client.get("/api/parcels/P-999999")
    assert response.status_code == 404
    assert "not found" in response.json()["detail"]


def test_document_requires_authentication(client):
    assert client.post("/api/document/verify", json={"fields": {"dag": "D-001"}}).status_code == 401
    assert client.post("/api/document/extract").status_code == 401


def test_document_candidates_exact_partial_and_absent(client, auth):
    def verify(fields):
        response = client.post("/api/document/verify", headers=auth, json={"fields": fields})
        assert response.status_code == 200
        return response.json()
    exact = verify({"khatian": "K-001", "dag": "D-001"})
    assert exact["multiple"] is False
    assert exact["matches"][0]["current_owner_name"] == "Synthetic Owner"
    # Backend returns candidates on ANY matching identifier; UI compares each field.
    partial = verify({"khatian": "K-001", "dag": "DIFFERENT"})
    assert partial["matches"][0]["dag_no"] == "D-001"
    assert verify({"dag": "NOT-FOUND"})["matches"] == []
    assert verify({})["matches"] == []
    assert verify({"dag": "' OR 1=1 --"})["matches"] == []


def test_document_upload_validation(client, auth):
    assert client.post("/api/document/extract", headers=auth).status_code == 422
    response = client.post("/api/document/extract", headers=auth, files={"file": ("test.txt", b"synthetic", "text/plain")})
    assert response.status_code == 422


@pytest.mark.parametrize("content_type,data", [
    ("text/plain", b"test"), ("application/pdf", b""), ("image/png", b"x" * (MAX_BYTES + 1)),
])
def test_extract_rejects_invalid_input_without_ocr(content_type, data):
    with pytest.raises(ValueError):
        extract_document("synthetic", content_type, data)


@pytest.mark.parametrize("mismatch", [False, True])
def test_computed_rule_results_drive_alert_listing(client, mismatch):
    import json
    from app.database.db import engine
    from app.models.tables import Owner, Transaction, Registration, Mutation, Analysis
    from app.detection import engine as E
    from app.services.scoring import priority_score, priority_level
    from tests.conftest import tx, reg, mut, make_ctx

    transaction = tx("T-000001", "O-000001", "O-000002")
    registration = reg("T-000001", "O-000001", "O-000001" if mismatch else "O-000002")
    mutation = mut("T-000001", "O-000001", "O-000002")
    ctx = make_ctx([transaction], [registration], [mutation])
    signals = E.run_rules(ctx).iloc[0]
    score = priority_score(signals.rule_points, 0)  # Fixed ML input; no model loading.
    analysis = {key: signals[key].item() for key in E.SIGNALS + ["signal_count", "rule_points"]}
    analysis.update(transaction_id="T-000001", parcel_id="P-000001", ml_score=0,
                    priority_score=score, priority_level=priority_level(score),
                    primary_signal=E.primary_signal(signals),
                    evidence_json=json.dumps(E.build_evidence(ctx.iloc[0], signals)))
    with engine.begin() as con:
        con.execute(Owner.__table__.insert(), {"owner_id": "O-000002", "synthetic_name": "Synthetic Buyer"})
        con.execute(Transaction.__table__.insert(), transaction)
        con.execute(Registration.__table__.insert(), registration)
        con.execute(Mutation.__table__.insert(), mutation)
        con.execute(Analysis.__table__.insert(), analysis)
    response = client.get("/api/alerts")
    assert response.status_code == 200
    result = response.json()
    assert result["total"] == (1 if mismatch else 0)
    if mismatch:
        alert = result["items"][0]
        assert alert["signals"]["registration_mismatch"] == 1
        assert alert["evidence_count"] > 0
        assert alert["recommended_action"] == "Human Review Required"
    else:
        assert result["items"] == []
