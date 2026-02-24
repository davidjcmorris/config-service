# Architecture

## Overview

The project has two independent components:

```
project/
├── config-service/   # Python REST API (FastAPI + PostgreSQL)
└── ui/               # TypeScript admin UI (Web Components + Vite)
```

The UI proxies `/api/*` requests to the backend during development. In production they are deployed separately.

---

## Backend (`config-service/`)

### Layered Architecture

```
HTTP Request
    ↓
Routers (app/routers/)        — FastAPI route handlers, HTTP concerns only
    ↓
Repositories (app/repositories/) — Raw SQL data access, plain functions
    ↓
Database (app/database.py)    — Connection pool, cursor dependency
    ↓
PostgreSQL
```

There is **no service/business-logic layer**. Repositories contain all data access logic using raw SQL via psycopg2.

### App Factory Pattern

`app/main.py` uses a `create_app()` factory function that constructs the FastAPI instance and registers routers. A lifespan context manager handles:

- **Startup**: initialise the connection pool → run pending migrations
- **Shutdown**: close the connection pool cleanly

### Async Cursor Pattern

The backend uses synchronous psycopg2 wrapped in a `ThreadPoolExecutor` to avoid blocking the async event loop.

`get_db_cursor()` in `app/database.py` is a FastAPI dependency that:
1. Acquires a connection from the pool via `loop.run_in_executor`
2. Opens a `RealDictCursor` (rows returned as dicts)
3. Yields the cursor to the route handler
4. Commits on success, rolls back on exception
5. Returns the connection to the pool

**Critical rule**: Repository functions receive the **cursor object directly** — not the context manager. The cursor is already open when passed in.

```python
# Correct — cursor is the actual psycopg2 cursor
def create(cursor: Any, data: ApplicationCreate) -> ApplicationResponse:
    cursor.execute("INSERT INTO ...", (...))
    return ApplicationResponse(**cursor.fetchone())
```

### Repository Pattern

Repositories are **plain modules of functions** (not classes). Each function signature is:

```python
def <action>(cursor: Any, ...) -> <ReturnType>:
```

Functions use raw SQL strings. Dynamic `UPDATE` queries build the `SET` clause from non-`None` fields only (partial update support).

### Auto-Migrations

On startup, `migrations.run(conn)` in `app/migrations.py`:
1. Ensures a `migrations` tracking table exists
2. Scans `migrations/*.sql` sorted by filename
3. Skips files already recorded in the tracking table
4. Applies pending files in order, recording each in the tracking table

Migration files are numbered with a zero-padded prefix (e.g. `0001_`, `0002_`) to guarantee sort order.

### ID Strategy

All primary keys are **ULIDs** (Universally Unique Lexicographically Sortable Identifiers), generated via `python-ulid` and stored as `VARCHAR(26)`. ULIDs are time-ordered and globally unique without a database sequence.

### Error Handling

Errors are caught in **routers**, not repositories:

| Database error | HTTP response |
|---|---|
| `UniqueViolation` | 409 Conflict |
| `ForeignKeyViolation` | 404 Not Found |
| Record not found (None returned) | 404 Not Found |

### Settings

`app/config.py` uses `pydantic-settings` with a `.env` file. Settings are cached via `@lru_cache` so the file is only read once.

---

## Frontend (`ui/`)

### Web Components — No Framework

The UI uses **native browser Web Components** only. No React, Vue, or other UI framework. Each component:
- Extends `HTMLElement`
- Uses Shadow DOM for style encapsulation (styles are inlined as template strings)
- Registers with `customElements.define()`

### Component Tree

```
<app-root>          — top-level shell, owns navigation state
  <app-list>        — accordion list of applications + their configurations
  <app-form>        — create/edit application form (also shows config list)
  <config-form>     — create/edit configuration form
  <confirm-dialog>  — reusable confirmation modal
```

### Event-Driven Navigation

Components communicate **upward** via `CustomEvent` with `{ bubbles: true, composed: true }`. `AppRoot` listens for navigation events and swaps the active component by re-rendering its shadow root:

| Event | Payload | Result |
|---|---|---|
| `navigate-to-list` | — | Show `<app-list>` |
| `navigate-to-app-form` | `{ applicationId? }` | Show `<app-form>` (create or edit) |
| `navigate-to-config-form` | `{ applicationId, configurationId? }` | Show `<config-form>` (create or edit) |

### Single-Open Accordion

`AppList` tracks a single `expandedId`. Clicking an application row:
- Collapses the previously expanded row (if any)
- Expands the clicked row and lazy-loads its configurations
- Configurations are cached in a `Map<appId, Configuration[]>` to avoid redundant fetches

The "Add configuration" button only appears when an application is expanded.

### Re-fetch After Mutation

After any successful create, update, or delete, the UI navigates back to the list and re-fetches data from the API. Local state is **never patched directly**.

### Draft Preservation on Error

Forms store `draftName` and `draftComments` properties. On a failed submit, these draft values are used in the re-render so the user's input is preserved alongside the error message. Drafts are cleared on successful save or cancel.

### API Layer

```
ui/src/api/
  client.ts           — generic fetch wrapper, ApiError class, friendlyErrorMessage()
  applications.ts     — typed wrappers for /api/v1/applications endpoints
  configurations.ts   — typed wrappers for /api/v1/configurations endpoints
```

`client.ts` handles:
- JSON serialisation/deserialisation
- Non-2xx responses → throws `ApiError(status, detail)`
- 204 No Content → returns `undefined`

`friendlyErrorMessage()` maps HTTP status codes to user-facing strings (never exposes raw status codes in the UI).

### Dev Proxy

Vite proxies all `/api/*` requests to `http://localhost:8000` during development, so the UI and API can run on different ports without CORS issues.
