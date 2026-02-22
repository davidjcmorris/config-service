import logging
from contextlib import asynccontextmanager

import psycopg2
from fastapi import FastAPI

from app import migrations
from app.config import get_settings
from app.database import close_pool, init_pool
from app.routers import applications, configurations

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    FastAPI lifespan context manager.

    On startup:
      1. Initializes the database connection pool.
      2. Runs pending SQL migrations automatically.

    On shutdown:
      - Closes the connection pool cleanly.
    """
    settings = get_settings()
    logging.basicConfig(level=settings.LOG_LEVEL.upper())

    logger.info("Starting Config Service (env=%s)", settings.APP_ENV)

    # Initialize connection pool
    init_pool()
    logger.info("Database connection pool initialized.")

    # Run migrations using a dedicated connection
    conn = psycopg2.connect(dsn=settings.DATABASE_URL)
    try:
        migrations.run(conn)
    finally:
        conn.close()

    logger.info("Migrations complete.")

    yield

    # Shutdown
    close_pool()
    logger.info("Database connection pool closed.")


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    app = FastAPI(
        title="Config Service",
        description="Centralized application configuration management API",
        version="0.1.0",
        lifespan=lifespan,
    )

    app.include_router(applications.router)
    app.include_router(configurations.router)

    return app


app = create_app()
