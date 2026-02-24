"""
Database smoke test — uses a REAL psycopg2 connection (not mocked).

Requirements:
  - A .env file must be present in config-service/ with a valid DATABASE_URL
    pointing to a running PostgreSQL instance.
  - The database schema must already be migrated (run the service once, or
    apply migrations manually).

This test will FAIL if the database is unreachable or the schema is missing.
Keep this file separate from database_test.py (which uses mocks) so the
intent and requirements of each are immediately clear.
"""

import psycopg2
import pytest

from app.config import get_settings


@pytest.fixture
def real_conn():
    """Open a real psycopg2 connection and guarantee cleanup via yield.

    Rolls back any uncommitted state and closes the connection after the test,
    even if the test body raises an exception.
    """
    settings = get_settings()
    conn = psycopg2.connect(settings.DATABASE_URL)
    conn.autocommit = False
    yield conn
    conn.rollback()
    conn.close()


def test_database_is_writable(real_conn):
    """
    Smoke test: verify PostgreSQL is active and the applications table is writable.

    Creates a real record, asserts it was written successfully, then deletes it
    as teardown. Cleanup is guaranteed by the fixture's rollback even if the
    assertion fails.
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
