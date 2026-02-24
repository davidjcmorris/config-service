# Technical Reference

## Backend (`config-service/`)

### Language & Runtime

- **Python** `>=3.13` (developed on 3.13.5)
- Package manager: **uv** (`make install` to set up)

### Production Dependencies

| Package | Version | Purpose |
|---|---|---|
| `fastapi` | `0.116.1` | Web framework |
| `uvicorn` | `>=0.39.0` | ASGI server |
| `psycopg2-binary` | `2.9.10` | PostgreSQL driver (sync, wrapped in ThreadPoolExecutor) |
| `pydantic` | `2.11.7` | Request/response model validation |
| `pydantic-settings` | `^2.0` | Settings from `.env` file |
| `python-ulid` | `^2.0` | ULID generation for primary keys |

### Dev Dependencies

| Package | Version | Purpose |
|---|---|---|
| `pytest` | `8.4.1` | Test runner |
| `pytest-asyncio` | `>=1.2.0` | Async test support (`asyncio_mode = "auto"`) |
| `httpx` | `0.28.1` | HTTP client for route tests |
| `ruff` | `>=0.15.2` | Linter and formatter |

### Development Commands

```bash
make install   # Install dependencies via uv
make run       # Start uvicorn dev server (auto-reloads)
make test      # Run pytest
make lint      # Run ruff
```

### Test Configuration

- Test files: `*_test.py` (inside `app/`)
- Test classes: `Test*`
- Test functions: `test_*`
- Async mode: `auto` (all async tests run automatically)

### Linting

- Tool: `ruff`
- Line length: 110
- Target: `py313`
- Rules: `E` (pycodestyle errors), `F` (pyflakes), `I` (isort), `UP` (pyupgrade)

### Environment Variables

Configured via `.env` file (copy from `.env.example`):

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | *(required)* | PostgreSQL DSN, e.g. `postgresql://user:pass@localhost:5432/config_service` |
| `LOG_LEVEL` | `INFO` | Python logging level |
| `APP_ENV` | `development` | Environment name (informational) |
| `DB_POOL_MIN_CONN` | `1` | Minimum connections in pool |
| `DB_POOL_MAX_CONN` | `10` | Maximum connections in pool |

### File Structure

```
config-service/
├── main.py                        # Uvicorn entry point
├── pyproject.toml                 # Project metadata and dependencies
├── Makefile                       # Dev commands
├── .env.example                   # Environment variable template
├── migrations/                    # SQL migration files (applied in filename order)
│   ├── 0001_create_migrations_table.sql
│   ├── 0002_create_applications_table.sql
│   └── 0003_create_configurations_table.sql
└── app/
    ├── main.py                    # App factory + lifespan
    ├── config.py                  # Settings (pydantic-settings, lru_cache)
    ├── database.py                # Connection pool + get_db_cursor dependency
    ├── migrations.py              # Migration runner
    ├── models/
    │   ├── application.py         # ApplicationCreate, ApplicationUpdate, ApplicationResponse
    │   └── configuration.py      # ConfigurationCreate, ConfigurationUpdate, ConfigurationResponse
    ├── repositories/
    │   ├── application_repository.py    # create, get_by_id, list_all, update, delete
    │   └── configuration_repository.py # create, get_by_id, list_by_application, update, delete
    └── routers/
        ├── applications.py        # GET/POST /applications, GET/PUT/DELETE /applications/{id}
        └── configurations.py     # GET/POST /configurations, GET/PUT/DELETE /configurations/{id}
```

---

## Frontend (`ui/`)

### Language & Tooling

- **TypeScript** `^5.7.3` — all source files are `.ts` (no `.js` directly)
- **Vite** `^5.4.14` — dev server (port 5173) and production bundler
- Package manager: **pnpm**

### Dev Dependencies

| Package | Version | Purpose |
|---|---|---|
| `typescript` | `^5.7.3` | TypeScript compiler |
| `vite` | `^5.4.14` | Dev server + bundler |
| `vitest` | `^2.1.9` | Unit test runner |
| `@vitest/ui` | `^2.1.9` | Vitest UI |
| `jsdom` | `^25.0.1` | DOM environment for unit tests |
| `@playwright/test` | `^1.50.1` | Integration (E2E) test runner |

*No runtime/production dependencies — the UI uses only native browser APIs.*

### Development Commands

```bash
pnpm dev           # Start Vite dev server on http://localhost:5173
pnpm build         # Type-check (tsc) + production build
pnpm test:unit     # Run Vitest unit tests (single run)
pnpm test:unit:watch  # Run Vitest in watch mode
pnpm test:e2e      # Run Playwright integration tests
pnpm test          # Run unit tests then E2E tests
```

### Unit Tests

- Runner: Vitest with jsdom environment
- Location: `tests/unit/**/*.test.ts`
- Config: `vite.config.ts` (`test.environment = 'jsdom'`)

### Integration Tests

- Runner: Playwright
- Location: `tests/integration/**/*.spec.ts`
- Browser: Chromium only, single worker (sequential)
- Base URL: `http://localhost:5173`
- Playwright auto-starts the Vite dev server if not already running
- Config: `playwright.config.ts`

### File Structure

```
ui/
├── index.html                     # Entry HTML, mounts <app-root>
├── package.json
├── vite.config.ts                 # Dev proxy + Vitest config
├── tsconfig.json
├── playwright.config.ts
├── src/
│   ├── main.ts                    # Imports and registers all custom elements
│   ├── types/
│   │   └── models.ts              # Application and Configuration TypeScript interfaces
│   ├── api/
│   │   ├── client.ts              # fetch wrapper, ApiError, friendlyErrorMessage()
│   │   ├── applications.ts        # listApplications, getApplication, createApplication, updateApplication, deleteApplication
│   │   └── configurations.ts     # listConfigurations, getConfiguration, createConfiguration, updateConfiguration, deleteConfiguration
│   ├── components/
│   │   ├── app-root.ts            # <app-root> — navigation shell
│   │   ├── app-list.ts            # <app-list> — accordion list view
│   │   ├── app-form.ts            # <app-form> — create/edit application
│   │   ├── config-form.ts         # <config-form> — create/edit configuration
│   │   └── confirm-dialog.ts      # <confirm-dialog> — delete confirmation modal
│   └── styles/
│       └── global.css             # Global CSS custom properties (design tokens)
└── tests/
    ├── unit/                      # Vitest unit tests
    └── integration/               # Playwright E2E tests
```

---

## Database Schema

### `applications`

```sql
CREATE TABLE applications (
    id       VARCHAR(26)  PRIMARY KEY,
    name     VARCHAR(256) UNIQUE NOT NULL,
    comments VARCHAR(1024)
);
```

### `configurations`

```sql
CREATE TABLE configurations (
    id             VARCHAR(26)  PRIMARY KEY,
    application_id VARCHAR(26)  NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    name           VARCHAR(256) NOT NULL,
    comments       VARCHAR(1024),
    config         JSONB        NOT NULL DEFAULT '{}',
    UNIQUE (application_id, name)
);
```

### `migrations` (internal tracking table)

```sql
CREATE TABLE migrations (
    id         SERIAL       PRIMARY KEY,
    filename   VARCHAR(256) UNIQUE NOT NULL,
    applied_at TIMESTAMPTZ  NOT NULL
);
```

---

## API Endpoints

All endpoints are prefixed with `/api/v1`.

### Applications

| Method | Path | Status | Description |
|---|---|---|---|
| `GET` | `/applications` | 200 | List all applications (ordered by name) |
| `POST` | `/applications` | 201 | Create application |
| `GET` | `/applications/{id}` | 200 | Get application by ID |
| `PUT` | `/applications/{id}` | 200 | Update application (partial — only non-null fields) |
| `DELETE` | `/applications/{id}` | 204 | Delete application (cascades to configurations) |

### Configurations

| Method | Path | Status | Description |
|---|---|---|---|
| `GET` | `/configurations?application_id=<id>` | 200 | List configurations for an application |
| `POST` | `/configurations` | 201 | Create configuration |
| `GET` | `/configurations/{id}` | 200 | Get configuration by ID |
| `PUT` | `/configurations/{id}` | 200 | Update configuration (partial) |
| `DELETE` | `/configurations/{id}` | 204 | Delete configuration |
