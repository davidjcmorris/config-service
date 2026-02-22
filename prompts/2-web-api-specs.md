> I need you to create a **comprehensive implementation plan** for a REST Web API called the **Config Service**. Please review all the details below carefully and adhere to them **strictly** — do not deviate from the specified tech stack, versions, patterns, or conventions. If anything is unclear or you need more information before finalizing the plan, **please ask before proceeding**.
>
> ---
>
> ### Tech Stack
>
> Use **exactly** these technologies and **exact version numbers** — do not substitute or upgrade without approval:
>
> | Area                | Choice              | Version              |
> |---------------------|---------------------|----------------------|
> | Language            | Python              | 3.13.5               |
> | Web framework       | FastAPI             | 0.116.1              |
> | Validation          | Pydantic            | 2.11.7               |
> | Service config      | Pydantic Settings   | >=2.0.0,<3.0.0       |
> | Testing framework   | pytest              | 8.4.1                |
> | Testing HTTP helper | httpx               | 0.28.1               |
> | Database engine     | PostgreSQL          | v16                  |
> | Python DB adapter   | psycopg2            | 2.9.10               |
> | ULID support        | python-ulid         | >=2.0.0,<3.0.0       |
>
> **Do NOT add any additional dependencies without explicit approval.**
>
> ---
>
> ### Data Models
>
> **Application** (DB table: `applications`)
> - `id`: primary key, string/ULID
> - `name`: unique, string(256)
> - `comments`: string(1024)
>
> **Configuration** (DB table: `configurations`)
> - `id`: primary key, string/ULID
> - `application_id`: foreign key → `applications.id`, string/ULID
> - `name`: string(256), unique per application
> - `comments`: string(1024)
> - `config`: JSONB — a dictionary of name/value pairs
>
> ---
>
> ### API Endpoints
>
> All endpoints must be prefixed with `/api/v1`.
>
> **Applications:**
> - `POST /api/v1/applications`
> - `PUT /api/v1/applications/{id}`
> - `GET /api/v1/applications/{id}` — response must include a list of all related `configuration.id` values
> - `GET /api/v1/applications`
>
> **Configurations:**
> - `POST /api/v1/configurations`
> - `PUT /api/v1/configurations/{id}`
> - `GET /api/v1/configurations/{id}`
>
> ---
>
> ### Data Persistence
>
> - **No ORM** — all database interactions must use raw SQL statements.
> - The connection pool must use the following components:
>   - `psycopg2.pool.ThreadedConnectionPool`
>   - `concurrent.futures.ThreadPoolExecutor`
>   - `contextlib.asynccontextmanager`
>   - `psycopg2.extras.RealDictCursor` as the `cursor_factory`
>   - `pydantic_extra_types.ulid.ULID` (from `python-ulid>=2.0.0,<3.0.0`, wrapped by Pydantic) as the primary key type
>
> ---
>
> ### Database Migrations
>
> Implement a migration system that includes:
> - A `migrations` database table (with appropriate tracking fields)
> - A `migrations/` folder containing `*.sql` migration files
> - A `migrations.py` file implementing the migration runner
> - A `migrations_test.py` file with unit tests for the migration system
>
> ---
>
> ### Automated Testing
>
> - **Every code file must have an associated unit test file** (except `__init__.py` files).
> - Unit tests must focus on the **80% most important scenarios** for the file under test.
> - Test files must use the `_test.py` suffix and be located **in the same folder** as the file they test.
> - A `test/` folder should only be created if needed for test helpers, shared mocks, or integration tests — do not create it preemptively.
>
> ---
>
> ### Dates and Times
>
> Use only **current, non-deprecated** Python date/time APIs. Reference the official Python 3 documentation at https://docs.python.org/3/library/time.html to validate any time-related code.
>
> ---
>
> ### Authentication
>
> Authentication is a **future feature** — do not plan for it now.
>
> ---
>
> ### Service Configuration
>
> - Use a `.env` file for environment variables (e.g., database connection string, logging level).
> - Use `pydantic-settings` (>=2.0.0,<3.0.0) to parse and validate environment variables.
>
> ---
>
> ### Developer Experience
>
> - Use `uv` for managing virtual environments, dependencies, and running scripts.
> - Do **not** use `pip` or `uv pip` — only `uv` directly (e.g., `uv add`, `uv sync`).
> - Include a `Makefile` with targets for all common tasks (`test`, `run`, etc.).
> - In the Makefile, use the `uv` module-calling syntax, e.g.: `uv run python -m pytest`
>
> ---
>
> ### What I Need From You
>
> Please produce a **comprehensive implementation plan** that includes:
> 1. **All required dependencies** with exact version numbers as specified above
> 2. **Complete file and folder structure** for the project
> 3. **Architectural patterns** and design decisions (e.g., how the connection pool is structured, how routing is organized, how migrations are managed)
> 4. A description of each file's responsibility
> 5. Any assumptions you are making
>
> Again — **do not add dependencies not listed above without asking first**, and **ask clarifying questions** if anything is ambiguous before finalizing the plan.