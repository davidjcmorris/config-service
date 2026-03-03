# Environment & Scripts

## Environments
This project runs locally in a development environment only. There is no staging or production environment currently configured.

## Environment Variables
The config-service requires a `.env` file in the `config-service/` directory. This file is not committed to git. Create it with the following variables:
```
DATABASE_URL=postgresql://[username]@localhost:5432/config_service
LOG_LEVEL=INFO
APP_ENV=development
DB_POOL_MIN_CONN=1
DB_POOL_MAX_CONN=10
```

`[username]` is your local macOS username (e.g. `david` or `home`).

## Prerequisites
The following must be installed and running before starting the project:

- **PostgreSQL** — install via Homebrew: 
  `brew install postgresql@17`
- **uv** — Python package manager: 
  `curl -LsSf https://astral.sh/uv/install.sh | sh`
- **pnpm** — Node package manager: 
  `curl -fsSL https://get.pnpm.io/install.sh | sh -`
- **Node.js** — installed automatically by Cline/pnpm if missing

PostgreSQL must be running before starting the config-service. 
Start it with:
```bash
brew services start postgresql@17
```

## Starting the Project
Two terminal windows are required — one for each service.

**Terminal 1 — config-service backend:**
```bash
cd config-service && uv run uvicorn app.main:app --reload
```

**Terminal 2 — UI dev server:**
```bash
cd ui && pnpm run dev
```

Alternatively, use the `start.sh` script in the project root:
```bash
./start.sh
```

Note: if `uv` is not found, use the full path:
```bash
~/.local/bin/uv run uvicorn app.main:app --reload
```

## Backend Scripts (config-service)
Run from the `config-service/` directory:
```
| Command     | Description                          | When to use                         |
|-------------|--------------------------------------|-------------------------------------|
| `make run`  | Start the API server with hot reload | Local development                   |
| `make test` | Run the full pytest test suite       | Before committing                   |
| `make lint` | Run ruff linter                      | Before committing                   |
| `uv sync`   | Restore Python virtual environment   | After cloning or switching machines |
```
## Frontend Scripts (ui)
Run from the `ui/` directory:
```
| Command                | Description                        | When to use        |
|------------------------|------------------------------------|--------------------|
| `pnpm dev`             | Start Vite dev server on port 5173 | Local development  |
| `pnpm test:unit`       | Run Vitest unit tests              | During development |
| `pnpm test:unit:watch` | Run Vitest in watch mode           | Active development |
| `pnpm test:e2e`        | Run Playwright integration tests   | Before committing  |
| `pnpm test`            | Run all tests (unit + e2e)         | Before committing  |
| `pnpm build`           | Build for production               | When needed        |
```
Note: `pnpm test:e2e` requires both the config-service and Vite dev server to be running.

## Client Library Scripts (client-lib)
Run from the `client-lib/` directory:
```
| Command           | Description              | When to use        |
|-------------------|--------------------------|--------------------|
| `pnpm test`       | Run Vitest tests         | Before committing  |
| `pnpm test:watch` | Run Vitest in watch mode | Active development |
```
## Going Off-Script
- During active development it is acceptable to run individual test files rather than the full suite: 
  `uv run python -m pytest app/routers/applications_test.py`
- Playwright tests can be run against a specific file:
  `pnpm test:e2e tests/integration/applications.spec.ts`
- The Vite proxy handles CORS in development — do not run the UI directly against the API without the proxy
- Never commit with failing tests
- Never commit without running lint