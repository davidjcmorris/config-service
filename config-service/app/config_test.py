import pytest

from app.config import Settings, get_settings


def test_settings_defaults():
    settings = Settings(DATABASE_URL="postgresql://user:pass@localhost/test")
    assert settings.LOG_LEVEL == "INFO"
    assert settings.APP_ENV == "development"
    assert settings.DB_POOL_MIN_CONN == 1
    assert settings.DB_POOL_MAX_CONN == 10


def test_settings_custom_values():
    settings = Settings(
        DATABASE_URL="postgresql://user:pass@localhost/test",
        LOG_LEVEL="DEBUG",
        APP_ENV="production",
        DB_POOL_MIN_CONN=2,
        DB_POOL_MAX_CONN=20,
    )
    assert settings.DATABASE_URL == "postgresql://user:pass@localhost/test"
    assert settings.LOG_LEVEL == "DEBUG"
    assert settings.APP_ENV == "production"
    assert settings.DB_POOL_MIN_CONN == 2
    assert settings.DB_POOL_MAX_CONN == 20


def test_get_settings_returns_singleton(monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "postgresql://user:pass@localhost/test")
    get_settings.cache_clear()
    s1 = get_settings()
    s2 = get_settings()
    assert s1 is s2
    get_settings.cache_clear()
