from unittest.mock import MagicMock, patch

import pytest

import app.database as db_module


def test_init_pool_creates_pool(monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "postgresql://user:pass@localhost/test")
    from app.config import get_settings

    get_settings.cache_clear()

    mock_pool = MagicMock()
    with patch("app.database.psycopg2.pool.ThreadedConnectionPool", return_value=mock_pool) as mock_cls:
        db_module._pool = None
        db_module.init_pool()
        mock_cls.assert_called_once()
        assert db_module._pool is mock_pool

    db_module._pool = None
    get_settings.cache_clear()


def test_close_pool_closes_and_clears(monkeypatch):
    mock_pool = MagicMock()
    db_module._pool = mock_pool
    db_module.close_pool()
    mock_pool.closeall.assert_called_once()
    assert db_module._pool is None


def test_close_pool_noop_when_none():
    db_module._pool = None
    db_module.close_pool()  # Should not raise


@pytest.mark.asyncio
async def test_get_db_cursor_commits_on_success():
    mock_conn = MagicMock()
    mock_cursor = MagicMock()
    mock_conn.cursor.return_value.__enter__ = MagicMock(return_value=mock_cursor)
    mock_conn.cursor.return_value.__exit__ = MagicMock(return_value=False)

    mock_pool = MagicMock()
    mock_pool.getconn.return_value = mock_conn
    db_module._pool = mock_pool

    # get_db_cursor is a plain async generator (FastAPI dependency pattern)
    gen = db_module.get_db_cursor()
    cursor = await gen.__anext__()
    assert cursor is mock_cursor
    try:
        await gen.__anext__()
    except StopAsyncIteration:
        pass

    mock_conn.commit.assert_called_once()
    mock_pool.putconn.assert_called_once_with(mock_conn)
    db_module._pool = None


@pytest.mark.asyncio
async def test_get_db_cursor_rolls_back_on_exception():
    mock_conn = MagicMock()
    mock_cursor = MagicMock()
    mock_conn.cursor.return_value.__enter__ = MagicMock(return_value=mock_cursor)
    mock_conn.cursor.return_value.__exit__ = MagicMock(return_value=False)

    mock_pool = MagicMock()
    mock_pool.getconn.return_value = mock_conn
    db_module._pool = mock_pool

    # get_db_cursor is a plain async generator (FastAPI dependency pattern)
    gen = db_module.get_db_cursor()
    await gen.__anext__()
    with pytest.raises(ValueError):
        await gen.athrow(ValueError("test error"))

    mock_conn.rollback.assert_called_once()
    mock_pool.putconn.assert_called_once_with(mock_conn)
    db_module._pool = None
