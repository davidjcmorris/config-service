import datetime
import logging
from pathlib import Path

import psycopg2

logger = logging.getLogger(__name__)

MIGRATIONS_DIR = Path(__file__).parent.parent / "migrations"


def run(conn: psycopg2.extensions.connection) -> None:
    """
    Run all pending SQL migrations in order.

    Ensures the migrations tracking table exists, then scans the migrations/
    directory for *.sql files sorted by filename. Skips files already recorded
    in the migrations table and applies pending ones in order.
    """
    with conn.cursor() as cursor:
        # Ensure the migrations tracking table exists (idempotent)
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS migrations (
                id SERIAL PRIMARY KEY,
                filename VARCHAR(256) UNIQUE NOT NULL,
                applied_at TIMESTAMPTZ NOT NULL
            )
            """
        )
        conn.commit()

        # Fetch already-applied migrations
        cursor.execute("SELECT filename FROM migrations")
        applied = {row[0] for row in cursor.fetchall()}

        # Scan and sort migration files
        migration_files = sorted(MIGRATIONS_DIR.glob("*.sql"))

        for migration_file in migration_files:
            filename = migration_file.name
            if filename in applied:
                logger.debug("Skipping already-applied migration: %s", filename)
                continue

            logger.info("Applying migration: %s", filename)
            sql = migration_file.read_text(encoding="utf-8")

            try:
                cursor.execute(sql)
                cursor.execute(
                    "INSERT INTO migrations (filename, applied_at) VALUES (%s, %s)",
                    (filename, datetime.datetime.now(datetime.UTC)),
                )
                conn.commit()
                logger.info("Applied migration: %s", filename)
            except Exception:
                conn.rollback()
                logger.exception("Failed to apply migration: %s", filename)
                raise
