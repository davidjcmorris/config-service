# Testing

## Overview

The project has two independent test suites — one per component — with different runners, conventions, and scopes. All backend tests run without a real database (mocked). All frontend unit tests run without a real API (mocked). Integration tests require both services to be running.

---

## Backend (`config-service/`)

### Stack

| Tool | Version | Purpose |
|---|---|---|
| `pytest` | 8.4.1 | Test runner |
| `pytest-asyncio` | ≥1.2.0 | Async test support (`asyncio_mode = "auto"`) |
| `httpx` | 0.28.1 | In-process HTTP client via `ASGITransport` |
| `unittest.mock` | stdlib | Mocking (MagicMock, patch) |

### Running tests

```bash
cd config-service
make test        # runs pytest across app/
```

Pytest is configured in `pyproject.toml`:

```toml
[tool.pytest.ini_options]
asyncio_mode = "auto"
testpaths = ["app"]
python_files = ["*_test.py"]
python_classes = ["Test*"]
python_functions = ["test_*"]
```

### File naming and location

Test files live **alongside** the source file they test, not in a separate `tests/` directory:

```
app/
├── config.py
├── config_test.py          ← tests for config.py
├── database.py
├── database_test.py        ← tests for database.py
├── models/
│   ├── application.py
│   └── application_test.py ← tests for application.py
├── repositories/
│   ├── application_repository.py
│   └── application_repository_test.py
└── routers/
    ├── applications.py
    └── applications_test.py
```

Pattern: `<module>_test.py` — **not** `test_<module>.py`.

### Test layers and what each layer tests

| Layer | File pattern | What is mocked | What is tested |
|---|---|---|---|
| Models | `models/*_test.py` | Nothing | Pydantic validation rules, field defaults, required fields |
| Repositories | `repositories/*_test.py` | psycopg2 cursor (`MagicMock`) | SQL execution, return value mapping, None-on-not-found |
| Routers | `routers/*_test.py` | Repository functions + DB dependency | HTTP status codes, request/response shapes, error mapping |
| Database | `database_test.py` | psycopg2 pool and connection | Commit on success, rollback on exception, pool lifecycle |
| Migrations | `migrations_test.py` | psycopg2 connection + `tmp_path` | Skip applied, apply pending, rollback on failure |
| Config | `config_test.py` | Environment variables via `monkeypatch` | Settings defaults, custom values, `lru_cache` singleton |

### Mocking patterns

#### Cursor mock (repository tests)

Repository functions receive a cursor directly. Mock it with `MagicMock` and set `fetchone`/`fetchall` return values:

```python
def make_cursor(fetchone_return=None, fetchall_return=None):
    cursor = MagicMock()
    cursor.fetchone.return_value = fetchone_return
    cursor.fetchall.return_value = fetchall_return or []
    return cursor

def test_get_by_id_returns_application():
    row = {"id": "01ARZ3NDEKTSV4RRFFQ69G5FAV", "name": "my-app", ...}
    cursor = make_cursor(fetchone_return=row)
    result = application_repository.get_by_id(cursor, "01ARZ3NDEKTSV4RRFFQ69G5FAV")
    assert result.name == "my-app"
```

#### FastAPI dependency override (router tests)

Override `get_db_cursor` so routes receive a mock cursor without touching the real pool:

```python
def make_app(mock_cursor=None):
    app = FastAPI()
    if mock_cursor is None:
        mock_cursor = MagicMock()

    async def override_get_db_cursor():
        yield mock_cursor

    from app.database import get_db_cursor
    app.dependency_overrides[get_db_cursor] = override_get_db_cursor
    app.include_router(router)
    return app
```

#### Patching repository functions in router tests

Patch at the **import site in the router**, not at the definition site:

```python
# Correct — patch where the router imports it
with patch("app.routers.applications.application_repository.create", return_value=SAMPLE_APP):
    ...

# Wrong — patching the definition site has no effect on the router
with patch("app.repositories.application_repository.create", return_value=SAMPLE_APP):
    ...
```

#### Simulating database errors in router tests

```python
import psycopg2

with patch(
    "app.routers.applications.application_repository.create",
    side_effect=psycopg2.errors.UniqueViolation(),
):
    response = await client.post("/api/v1/applications", json={"name": "duplicate"})

assert response.status_code == 409
```

#### Settings and lru_cache

Always clear the cache before **and** after any test that touches environment variables:

```python
def test_get_settings_returns_singleton(monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "postgresql://user:pass@localhost/test")
    get_settings.cache_clear()   # clear before
    s1 = get_settings()
    s2 = get_settings()
    assert s1 is s2
    get_settings.cache_clear()   # clear after — prevents state leaking into other tests
```

#### In-process HTTP testing (router and main tests)

Use `httpx.AsyncClient` with `ASGITransport` — no real server needed:

```python
async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
    response = await client.get("/api/v1/applications/01ARZ3NDEKTSV4RRFFQ69G5FAV")
assert response.status_code == 200
```

---

## Frontend (`ui/`)

### Stack

| Tool | Version | Purpose |
|---|---|---|
| Vitest | 2.1.9 | Unit test runner |
| jsdom | 25.0.1 | DOM environment for unit tests |
| Playwright | 1.58.2 | Integration (E2E) tests |

### Running tests

```bash
cd ui
pnpm test:unit        # Vitest, single run
pnpm test:unit:watch  # Vitest, watch mode
pnpm test:e2e         # Playwright (requires backend on :8000)
pnpm test             # unit tests then E2E tests
```

### File naming and location

```
tests/
├── unit/                    # Vitest — *.test.ts
│   ├── api-client.test.ts
│   ├── app-form.test.ts
│   ├── app-list.test.ts
│   └── config-form.test.ts
└── integration/             # Playwright — *.spec.ts
    ├── applications.spec.ts
    └── configurations.spec.ts
```

- Unit tests: `tests/unit/**/*.test.ts`
- Integration tests: `tests/integration/**/*.spec.ts`

### Unit test conventions

#### Module mocking — declare before imports

`vi.mock(...)` calls are hoisted by Vitest. Always declare them **before** importing the module under test:

```typescript
// Correct — mock declared before component import
vi.mock('../../src/api/applications.js', () => ({
  createApplication: vi.fn(),
  updateApplication: vi.fn(),
  deleteApplication: vi.fn(),
  getApplication: vi.fn(),
}));

import '../../src/components/app-form.js';
```

#### Mounting Web Components

Mount by setting `document.body.innerHTML`. Access shadow DOM via `shadowRoot`:

```typescript
document.body.innerHTML = '<app-form></app-form>';
const shadow = document.querySelector('app-form')!.shadowRoot!;
const input = shadow.querySelector('[name="name"]') as HTMLInputElement;
```

#### Waiting for async renders

Components fetch data asynchronously on connect. Use `vi.waitFor` to wait for DOM updates:

```typescript
vi.mocked(listApplications).mockResolvedValue([SAMPLE_APP]);
document.body.innerHTML = '<app-list></app-list>';

await vi.waitFor(() => {
  expect(shadow.textContent).toContain('my-app');
});
```

#### Cleanup after each test

Always reset the DOM and clear mocks in `afterEach`:

```typescript
afterEach(() => {
  document.body.innerHTML = '';
  vi.clearAllMocks();
});
```

#### Stubbing global fetch (api-client tests)

```typescript
vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
  ok: true,
  status: 200,
  json: () => Promise.resolve({ id: '1', name: 'test' }),
}));

afterEach(() => {
  vi.unstubAllGlobals();
});
```

#### Testing custom events (navigation)

Listen on the element, not on `document`, because events use `{ bubbles: true, composed: true }`:

```typescript
const events: CustomEvent[] = [];
getEl().addEventListener('navigate-to-list', (e) => events.push(e as CustomEvent));

(shadow.querySelector('.cancel-btn') as HTMLButtonElement).click();

expect(events).toHaveLength(1);
```

### Integration tests

#### What must be running

| Service | URL | How to start |
|---|---|---|
| Backend API | `http://localhost:8000` | `cd config-service && make run` |
| Vite dev server | `http://localhost:5173` | Auto-started by Playwright, or `pnpm dev` |

Playwright auto-starts the Vite dev server if it is not already running (`reuseExistingServer: true` in dev). The backend must be started manually.

#### Test data management

Integration tests create real data via the API and clean it up in `test.afterAll`. Collect created IDs and delete them after the suite:

```typescript
const createdIds: string[] = [];

test.afterAll(async () => {
  for (const id of createdIds) {
    await deleteApp(apiContext, id).catch(() => undefined);  // .catch prevents afterAll from failing
  }
  await apiContext.dispose();
});
```

#### Shadow DOM piercing

Playwright uses the `pierce/` prefix to query inside shadow roots:

```typescript
// Click a button inside a shadow root
await page.locator('app-list').locator('pierce/.add-app').click();

// Find by text inside shadow root
const btn = page.locator('app-list').locator('pierce/.app-name-btn', { hasText: name });
```

---

## Planned improvements

### 1. Conditional DATABASE_URL test

**Problem:** A test that verifies `Settings()` raises `ValidationError` when `DATABASE_URL` is missing was removed because it always fails in development — the `.env` file is always present.

**Fix:** Reinstate it with `pytest.mark.skipif` so it skips gracefully when `DATABASE_URL` is set, but catches genuine misconfiguration in CI or fresh environments.

**Location:** `config-service/app/config_test.py`

```python
import os
import pytest
from pydantic import ValidationError
from app.config import Settings

@pytest.mark.skipif(
    os.getenv("DATABASE_URL") is not None,
    reason="DATABASE_URL is set in environment — skipping missing-URL test"
)
def test_settings_requires_database_url():
    """Fails if DATABASE_URL is genuinely absent (e.g. in CI without .env)."""
    with pytest.raises(ValidationError):
        Settings()
```

### 2. Database smoke test with cleanup

**Problem:** All backend tests mock the database. It is possible for all tests to pass while the real PostgreSQL connection is broken or the schema is wrong.

**Fix:** A separate integration test file that makes a real database connection, writes a record, asserts it was written, and deletes it in teardown — guaranteed even if the assertion fails.

**Location:** `config-service/app/database_smoke_test.py` (new file — separate from `database_test.py` because it uses a real connection, not mocks)

**Requirement:** The `.env` file must be present with a valid `DATABASE_URL` pointing to a running PostgreSQL instance. This test will fail if the database is unreachable or the schema has not been migrated.

```python
import pytest
import psycopg2
from app.config import get_settings

@pytest.fixture
def real_conn():
    """Open a real psycopg2 connection and guarantee cleanup via yield."""
    settings = get_settings()
    conn = psycopg2.connect(settings.DATABASE_URL)
    conn.autocommit = False
    yield conn
    conn.rollback()   # roll back any uncommitted state
    conn.close()

def test_database_is_writable(real_conn):
    """
    Smoke test: verify PostgreSQL is active and the applications table is writable.
    Creates a real record, asserts it exists, then deletes it.
    Cleanup is guaranteed by the fixture's rollback even if the assertion fails.
    """
    from ulid import ULID
    test_id = str(ULID())
    test_name = f"__smoke_test_{test_id}"

    with real_conn.cursor() as cur:
        # Write
        cur.execute(
            "INSERT INTO applications (id, name) VALUES (%s, %s)",
            (test_id, test_name),
        )
        real_conn.commit()

        # Assert
        cur.execute("SELECT name FROM applications WHERE id = %s", (test_id,))
        row = cur.fetchone()
        assert row is not None, "Record was not written to the database"
        assert row[0] == test_name

        # Teardown — delete the record
        cur.execute("DELETE FROM applications WHERE id = %s", (test_id,))
        real_conn.commit()
```

---

## Good and bad patterns

### ✅ Good patterns

- **Patch at the import site.** In router tests, patch `app.routers.applications.application_repository.create`, not `app.repositories.application_repository.create`. The router has already imported the name — patching the original has no effect.
- **Clear `lru_cache` before and after settings tests.** Failing to clear after a test leaks cached settings into subsequent tests.
- **Use `vi.mock(...)` before component imports** in Vitest. Vitest hoists mock declarations, but the import order in source still matters for clarity.
- **Use `vi.waitFor(...)` for async DOM assertions.** Web Components fetch data asynchronously; never assert on DOM state synchronously after mounting.
- **Collect and delete test data in `afterAll`.** Integration tests must not leave data in the database. Use `.catch(() => undefined)` on cleanup calls so a failed delete does not abort the rest of cleanup.
- **Use `yield` fixtures for teardown.** The `yield`-based pytest fixture pattern guarantees cleanup runs even when the test body raises an exception.

### ❌ Anti-patterns to avoid

- **Patching at the definition site instead of the import site.** `patch("app.repositories.application_repository.create")` has no effect on a router that has already imported the function.
- **Forgetting `get_settings.cache_clear()` after env-var tests.** The `lru_cache` persists across tests in the same process. Always clear it in both setup and teardown.
- **Asserting on raw HTTP status codes in UI tests.** The UI maps status codes to friendly messages via `friendlyErrorMessage()`. Tests should assert on the user-visible string (e.g. `'This name is already in use.'`), not on `409`.
- **Skipping `afterAll` cleanup in integration tests.** Leaving test records in the database causes test pollution and makes the database grow unboundedly.
- **Asserting synchronously after mounting a Web Component.** Components are async — always use `vi.waitFor(...)`.
- **Mixing real and mocked DB tests in the same file.** Keep `database_test.py` (mocked) and `database_smoke_test.py` (real connection) separate so the intent and requirements of each are immediately clear.
