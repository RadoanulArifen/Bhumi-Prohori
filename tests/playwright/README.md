# LandGuard Playwright browser tests

Status: **code prepared; browser execution has not been verified**. These tests are
separate from the 80 passed pytest/Vitest cases in `docs/TEST_RESULTS.md`.

The five Chromium tests cover initial parcel listing, Dag search and reset, API
error/retry, document field matches (including Bangla acre conversion), and Dag
mismatch with an investigation link. They use the real React UI with intercepted
synthetic API responses. They do not test the real FastAPI backend, authentication,
OCR, ML or production database.

## Setup and run

Install existing frontend dependencies if needed, from the repository root:

```sh
cd frontend
npm ci
cd ../tests/playwright
npm install
npx playwright install chromium
npm test
```

If frontend dependencies are already installed, start directly in `tests/playwright`.
Playwright's dependency and browser installation require internet once; test data
and runtime API responses are local. Linux may need browser system dependencies
installed separately (`npx playwright install-deps chromium`).

The config starts Vite on **127.0.0.1:5187**, forces same-origin API URLs, and refuses
to reuse an existing server. No backend needs to run. Unhandled API and external
HTTP requests are aborted. Each test uses a fresh browser context with English UI
and a synthetic authenticated profile. No real credentials are used.

```sh
npm run test:ui         # Interactive browser-test UI
npm run report         # View HTML report after running tests
npm test -- --list     # List the five cases without executing the browser tests
```

Dependencies are isolated in this folder: existing backend/frontend dependency
files and CI workflows were not changed. Do not count these browser tests as
passing until `npm test` completes successfully. Review and retain the generated
package-lock.json after installing dependencies for reproducible future installs.
