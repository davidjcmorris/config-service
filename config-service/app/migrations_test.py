from unittest.mock import MagicMock, patch

import pytest

from app import migrations


def make_mock_conn(applied_filenames: list[str] | None = None):
    """Helper to build a mock psycopg2 connection with cursor."""
    mock_conn = MagicMock()
    mock_cursor = MagicMock()

    # cursor() used as context manager
    mock_conn.cursor.return_value.__enter__ = MagicMock(return_value=mock_cursor)
    mock_conn.cursor.return_value.__exit__ = MagicMock(return_value=False)

    rows = [(f,) for f in (applied_filenames or [])]
    mock_cursor.fetchall.return_value = rows

    return mock_conn, mock_cursor


def test_run_applies_pending_migrations(tmp_path):
    # Create fake migration files
    (tmp_path / "0001_first.sql").write_text("CREATE TABLE foo (id INT);")
    (tmp_path / "0002_second.sql").write_text("CREATE TABLE bar (id INT);")

    mock_conn, mock_cursor = make_mock_conn(applied_filenames=[])

    with patch.object(migrations, "MIGRATIONS_DIR", tmp_path):
        migrations.run(mock_conn)

    # Should have executed both migration SQLs
    executed_sqls = [c.args[0] for c in mock_cursor.execute.call_args_list if c.args]
    assert any("CREATE TABLE foo" in s for s in executed_sqls)
    assert any("CREATE TABLE bar" in s for s in executed_sqls)
    assert mock_conn.commit.call_count >= 3  # 1 for table creation + 2 for migrations


def test_run_skips_already_applied(tmp_path):
    (tmp_path / "0001_first.sql").write_text("CREATE TABLE foo (id INT);")

    mock_conn, mock_cursor = make_mock_conn(applied_filenames=["0001_first.sql"])

    with patch.object(migrations, "MIGRATIONS_DIR", tmp_path):
        migrations.run(mock_conn)

    executed_sqls = [c.args[0] for c in mock_cursor.execute.call_args_list if c.args]
    assert not any("CREATE TABLE foo" in s for s in executed_sqls)


def test_run_rolls_back_on_failure(tmp_path):
    (tmp_path / "0001_bad.sql").write_text("INVALID SQL;")

    mock_conn, mock_cursor = make_mock_conn(applied_filenames=[])
    mock_cursor.execute.side_effect = [
        None,  # CREATE TABLE IF NOT EXISTS migrations
        None,  # SELECT filename
        Exception("syntax error"),  # INVALID SQL
    ]

    with patch.object(migrations, "MIGRATIONS_DIR", tmp_path):
        with pytest.raises(Exception, match="syntax error"):
            migrations.run(mock_conn)

    mock_conn.rollback.assert_called_once()


def test_run_no_migrations(tmp_path):
    mock_conn, mock_cursor = make_mock_conn(applied_filenames=[])

    with patch.object(migrations, "MIGRATIONS_DIR", tmp_path):
        migrations.run(mock_conn)

    # Only the CREATE TABLE IF NOT EXISTS and SELECT should have been called
    assert mock_conn.commit.call_count == 1
