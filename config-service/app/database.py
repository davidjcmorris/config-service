import asyncio
from collections.abc import AsyncGenerator
from concurrent.futures import ThreadPoolExecutor

import psycopg2.pool
from psycopg2.extras import RealDictCursor

from app.config import get_settings

_pool: psycopg2.pool.ThreadedConnectionPool | None = None
_executor = ThreadPoolExecutor()


def init_pool() -> None:
    """Initialize the database connection pool."""
    global _pool
    settings = get_settings()
    _pool = psycopg2.pool.ThreadedConnectionPool(
        minconn=settings.DB_POOL_MIN_CONN,
        maxconn=settings.DB_POOL_MAX_CONN,
        dsn=settings.DATABASE_URL,
    )


def close_pool() -> None:
    """Close the database connection pool."""
    global _pool
    if _pool is not None:
        _pool.closeall()
        _pool = None


async def get_db_cursor() -> AsyncGenerator:
    """
    FastAPI dependency that yields a RealDictCursor.

    Acquires a connection from the pool via a thread executor (to avoid
    blocking the event loop), opens a RealDictCursor, commits on success,
    rolls back on exception, and returns the connection to the pool.
    """
    loop = asyncio.get_event_loop()

    conn = await loop.run_in_executor(_executor, _pool.getconn)
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            try:
                yield cursor
                await loop.run_in_executor(_executor, conn.commit)
            except Exception:
                await loop.run_in_executor(_executor, conn.rollback)
                raise
    finally:
        _pool.putconn(conn)
