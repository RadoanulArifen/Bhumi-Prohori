# Offline regression tests

From the repository root, using the existing backend virtual environment:

```sh
backend/venv/bin/python -m pytest -q backend/offline_tests backend/tests/test_detection.py
```

Or, with backend dependencies installed in your active environment:

```sh
python -m pytest -q backend/offline_tests backend/tests/test_detection.py
```

Frontend document comparison tests:

```sh
cd frontend
npm test -- --run src/DocumentVerification.offline.test.jsx
```

The GitHub Actions workflow runs these exact suites. Dependency installation requires
package-registry access; test execution uses no external services or secrets.
No dependencies were added: pytest, httpx, Vitest and Testing Library already exist.

## Isolation and coverage

Run the offline backend suite in a **fresh pytest process**, separately from legacy
API/data/ML suites. Its conftest sets an absolute temporary SQLite URL before app
imports, disables dotenv loading and overrides auth configuration with synthetic
credentials. Each API test clears/reseeds only that temporary database using the
existing SQLAlchemy models. TestClient uses the actual application and routes but
does not enter the lifespan that starts the background ML/SHAP loader.

Coverage includes clean transactions with no signals/evidence, double-sale evidence,
registration/mutation inconsistencies, score bounds for nonnegative rule outputs,
priority boundaries, parcel listing, pagination, validation, missing records,
document authentication, candidate matching and upload validation. Existing
synthetic detection tests additionally cover partial sales, over-transfer, rapid
transfer, chain breaks and temporal inconsistencies.

Frontend tests mock extraction/verification responses and block fetch; they exercise
the actual document UI's matching, mismatch/investigation link, missing fields and
Bangla acre-to-decimal conversion. Backend verification returns candidates on any
matching identifier; it does not itself classify every field as matched/mismatched.

These tests do not train/load an ML model, run OCR or inspect local datasets. The
legacy `backend/tests/test_api.py`, `test_data.py`, `test_ml.py` and frontend
`smoke.test.jsx` depend on prepared data/models or a running server and are excluded.
Do not run an unqualified `pytest` or `npm test` for this offline-only validation.

Known scoring limit: `priority_score` clamps ML input but does not clamp negative
rule points. Production `run_rules` emits nonnegative rule points, which is the
tested contract. No production behavior is changed to handle unsupported inputs.

## Validation on 2026-11-17

The backend command above passed **77 tests**; the frontend command passed **3 tests**.
Backend TestClient requests hung inside the restricted execution sandbox; the same
suite completed outside that sandbox in 2.46 seconds. No application workaround was
added. One installed Starlette/httpx deprecation warning and React Router future-flag
warnings were emitted; dependencies were left unchanged. GitHub Actions has been
configured but has not been run remotely.
