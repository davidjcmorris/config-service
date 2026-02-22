# Config Service

A REST API for managing application configurations, built with FastAPI and PostgreSQL.

## Overview

The Config Service provides a centralized store for application configuration data. It supports:
- Managing **applications** (named groups of configurations)
- Managing **configurations** (key-value pairs with JSONB storage, scoped to an application)

## Requirements

- Python 3.13.5
- PostgreSQL
- [uv](https://docs.astral.sh/uv/) package manager

## Setup

1. **Clone and install dependencies:**
   ```bash
   make install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials
   ```

3. **Run the service** (migrations run automatically on startup):
   ```bash
   make run
   ```

## API Endpoints

### Applications

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/v1/applications` | Create a new application |
| `GET` | `/api/v1/applications/{id}` | Get an application by ID |
| `PUT` | `/api/v1/applications/{id}` | Update an application |

### Configurations

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/v1/configurations` | Create a new configuration |
| `GET` | `/api/v1/configurations/{id}` | Get a configuration by ID |
| `PUT` | `/api/v1/configurations/{id}` | Update a configuration |

## Development

```bash
# Run tests
make test

# Lint code
make lint
```

## Architecture

- **`app/main.py`** — FastAPI app factory with lifespan (auto-migrations on startup)
- **`app/config.py`** — Settings via `pydantic-settings`
- **`app/database.py`** — Async-safe PostgreSQL connection pool
- **`app/migrations.py`** — Automatic SQL migration runner
- **`app/models/`** — Pydantic request/response models
- **`app/repositories/`** — Raw SQL data access layer
- **`app/routers/`** — FastAPI route handlers
- **`migrations/`** — SQL migration files
