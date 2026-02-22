# Finalized Implementation Plan: Config Service REST API

## Resolved Decisions

| # | Question | Decision |
|---|---|---|
| 1 | `uvicorn` | ✅ Approved — added as runtime dependency |
| 2 | `pytest-asyncio` | ✅ Approved — added as dev dependency |
| 3 | `ruff` | ✅ Approved — `lint` Makefile target included |
| 4 | `psycopg2-binary` | ✅ Use consistently (simpler for this learning project) |
| 5 | Migrations | ✅ Run automatically on app startup via `lifespan` |

---

## 1. Dependencies

### Runtime (`uv add`)
| Package | Version |
|---|---|
| `fastapi` | `==0.116.1` |
| `pydantic` | `==2.11.7` |
| `pydantic-settings` | `>=2.0.0,<3.0.0` |
| `psycopg2-binary` | `==2.9.10` |
| `python-ulid` | `>=2.0.0,<3.0.0` |
| `uvicorn` | latest stable |

### Dev (`uv add --dev`)
| Package | Version |
|---|---|
| `pytest` | `==8.4.1` |
| `httpx` | `==0.28.1` |
| `pytest-asyncio` | latest stable |
| `ruff` | latest stable |

---

## 2. File & Folder Structure

```
config-service/
├── .env                          # Environment variables (not committed)
├── .env.example                  # Template for .env
├── .gitignore
├── .python-version               # Pins Python 3.13.5 for uv
├── Makefile                      # Common dev tasks
├── pyproject.toml                # uv-managed project config + dependencies
├── README.md
│
├── migrations/                   # SQL migration files
│   ├── 0001_create_migrations_table.sql
│   ├── 0002_create_applications_table.sql
│   └── 0003_create_configurations_table.sql
│
└── app/
    ├── __init__.py
    │
    ├── main.py                   # FastAPI app factory, lifespan (pool init +
    │                             #   auto-migrations on startup), router registration
    ├── main_test.py
    │
    ├── config.py                 # pydantic-settings BaseSettings, loads .env
    ├── config_test.py
    │
    ├── database.py               # ThreadedConnectionPool + ThreadPoolExecutor +
    │                             #   asynccontextmanager + RealDictCursor
    ├── database_test.py
    │
    ├── migrations.py             # Migration runner (called from lifespan on startup)
    ├── migrations_test.py
    │
    ├── models/
    │   ├── __init__.py
    │   ├── application.py        # ApplicationCreate, ApplicationUpdate, ApplicationResponse
    │   ├── application_test.py
    │   ├── configuration.py      # ConfigurationCreate, ConfigurationUpdate, ConfigurationResponse
    │   └── configuration_test.py
    │
    ├── repositories/
    │   ├── __init__.py
    │   ├── application_repository.py
    │   ├── application_repository_test.py
    │   ├── configuration_repository.py
    │   └── configuration_repository_test.py
    │
    └── routers/
        ├── __init__.py
        ├── applications.py       # POST/PUT/GET /api/v1/applications
        ├── applications_test.py
        ├── configurations.py     # POST/PUT/GET /api/v1/configurations
        └── configurations_test.py
```

---

## 3. Architecture & Design Decisions

### `app/main.py` — App Factory & Lifespan
- Uses FastAPI's `lifespan` async context manager (not deprecated `on_event` hooks).
- On startup: initializes the DB connection pool, then runs `migrations.run()` automatically.
- On shutdown: closes the connection pool cleanly.
- Registers both routers with the `/api/v1` prefix.

### `app/config.py` — Service Configuration
- `pydantic-settings` `BaseSettings` subclass reads from `.env`.
- Fields: `DATABASE_URL`, `LOG_LEVEL`, `APP_ENV`, `DB_POOL_MIN_CONN`, `DB_POOL_MAX_CONN`.
- Exposed via a `@lru_cache`-decorated `get_settings()` function for singleton access.

### `app/database.py` — Connection Pool
- Initializes `psycopg2.pool.ThreadedConnectionPool` using settings from `config.py`.
- Uses `concurrent.futures.ThreadPoolExecutor` to run blocking psycopg2 calls off the async event loop.
- Exposes `get_db_cursor()` as an `@asynccontextmanager` that:
  1. Acquires a connection from the pool (via `loop.run_in_executor`)
  2. Opens a `RealDictCursor` (rows returned as dicts)
  3. Commits on success, rolls back on exception
  4. Returns the connection to the pool
- FastAPI routes use `Depends(get_db_cursor)` for injection.

### `app/migrations.py` — Migration Runner
- Called automatically during app startup (from `lifespan`).
- Ensures the `migrations` tracking table exists (idempotent `CREATE TABLE IF NOT EXISTS`).
- Scans `migrations/` for `*.sql` files, sorted by filename.
- Skips files already recorded in the `migrations` table.
- Applies pending files in order; records each with `applied_at = datetime.now(datetime.UTC)`.

### `migrations/*.sql` — Schema DDL
| File | Creates |
|---|---|
| `0001_create_migrations_table.sql` | `migrations` table (id SERIAL, filename VARCHAR(256) UNIQUE, applied_at TIMESTAMPTZ) |
| `0002_create_applications_table.sql` | `applications` table (id VARCHAR(26) PK, name VARCHAR(256) UNIQUE, comments VARCHAR(1024)) |
| `0003_create_configurations_table.sql` | `configurations` table (id VARCHAR(26) PK, application_id FK, name VARCHAR(256), comments VARCHAR(1024), config JSONB, UNIQUE(application_id, name)) |

### `app/models/` — Pydantic Models
- `ApplicationResponse` includes a `configuration_ids: list[str]` field (populated by a JOIN query).
- All `id` fields use `pydantic_extra_types.ulid.ULID` from `python-ulid`.
- ULIDs are generated at the repository layer before INSERT.

### `app/repositories/` — Raw SQL Layer
- Plain functions (not classes) accepting a cursor + data, returning Pydantic model instances.
- All queries use parameterized `%s` placeholders (psycopg2 style).
- `application_repository.get_by_id()` JOINs `configurations` to populate `configuration_ids`.

### `app/routers/` — FastAPI Routes
- Each router uses `APIRouter(prefix="/api/v1", tags=[...])`.
- All handlers are `async def`.
- HTTP status codes: `201` for POST, `200` for PUT/GET, `404` for not found, `409` for duplicate name conflicts.

### Dates & Times
- All timestamps: `datetime.datetime.now(datetime.UTC)` — modern, non-deprecated (Python 3.11+).
- No use of `datetime.utcnow()` or `time.time()` for wall-clock timestamps.

### Testing
- Every non-`__init__.py` file has a co-located `_test.py` file.
- Repository tests mock the DB cursor (no real DB needed).
- Router tests use `httpx.AsyncClient` with mocked repositories.
- No `tests/` folder created preemptively.

---

## 4. Makefile

```makefile
.PHONY: install run test migrate lint

install:
	uv sync

run:
	uv run python -m uvicorn app.main:app --reload

test:
	uv run python -m pytest

lint:
	uv run python -m ruff check .
```

> Note: `migrate` is no longer a separate Makefile target since migrations run automatically on startup. It can be added later if a standalone migration CLI is needed.

---

## 5. `.env.example`

```dotenv
DATABASE_URL=postgresql://user:password@localhost:5432/config_service
LOG_LEVEL=INFO
APP_ENV=development
DB_POOL_MIN_CONN=1
DB_POOL_MAX_CONN=10
```