import os

import pytest
from pydantic import ValidationError

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


def _database_url_is_available() -> bool:
    """Return True if DATABASE_URL is resolvable — either from the environment
    or from a .env file in the config-service directory."""
    if os.getenv("DATABASE_URL") is not None:
        return True
    env_file = os.path.join(os.path.dirname(__file__), "..", ".env")
    return os.path.isfile(env_file)


@pytest.mark.skipif(
    _database_url_is_available(),
    reason="DATABASE_URL is available (.env present or env var set) — skipping missing-URL test",
)
def test_settings_requires_database_url():
    """Fails if DATABASE_URL is genuinely absent (e.g. in CI without .env)."""
    with pytest.raises(ValidationError):
        Settings()
