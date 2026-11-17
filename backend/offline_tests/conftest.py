"""Offline suite: redirect configuration BEFORE importing any application module.

Run this suite alone; legacy tests intentionally depend on local datasets/models.
"""
import os
import sys
import tempfile
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
_test_dir = tempfile.TemporaryDirectory(prefix="landguard-tests-")
os.environ["DATABASE_URL"] = "sqlite:///" + str(Path(_test_dir.name) / "test.sqlite")
os.environ["PYTHON_DOTENV_DISABLED"] = "1"
os.environ["ADMIN_EMAIL"] = "investigator@example.invalid"
os.environ["ADMIN_PASSWORD"] = "synthetic-test-password"
os.environ["AUTH_SECRET"] = "synthetic-offline-test-secret"

# Refuse mixed collection if application configuration was imported elsewhere first.
if "app.config" in sys.modules:
    raise RuntimeError("Run offline_tests separately in a fresh pytest process")


@pytest.fixture
def client():
    from fastapi.testclient import TestClient
    from app.main import app
    from app.database.db import Base, engine
    from app.models.tables import Owner, Parcel
    from sqlalchemy import text

    assert str(engine.url.database).startswith(_test_dir.name + os.sep)
    Base.metadata.create_all(engine)
    with engine.begin() as con:
        for table in reversed(Base.metadata.sorted_tables):
            con.execute(table.delete())
        for table in ("investigator_auth", "investigator_auth_settings"):
            con.execute(text(f"DROP TABLE IF EXISTS {table}"))
        con.execute(Owner.__table__.insert(), {"owner_id": "O-000001", "synthetic_name": "Synthetic Owner"})
        con.execute(Parcel.__table__.insert(), {
            "parcel_id": "P-000001", "district": "Test District", "upazila": "Test Upazila",
            "mouza": "Test Mouza", "khatian_no": "K-001", "dag_no": "D-001",
            "total_area_decimal": 10.0, "current_owner_id": "O-000001", "land_type": "Agricultural",
        })
    # No context manager: deliberately do not start the ML warm-up lifespan thread.
    test_client = TestClient(app)
    yield test_client
    test_client.close()


@pytest.fixture
def auth(client):
    response = client.post("/api/auth/login", json={
        "email": "investigator@example.invalid", "password": "synthetic-test-password",
    })
    assert response.status_code == 200
    return {"Authorization": "Bearer " + response.json()["access_token"]}
