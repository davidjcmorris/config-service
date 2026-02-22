from unittest.mock import MagicMock, patch

import pytest
from httpx import ASGITransport, AsyncClient


def make_test_app():
    """
    Create a FastAPI app for testing with mocked DB pool and migrations.
    Uses a lifespan that skips real DB connections.
    """
    from contextlib import asynccontextmanager

    from fastapi import FastAPI

    from app.routers import applications, configurations

    @asynccontextmanager
    async def mock_lifespan(app: FastAPI):
        yield

    app = FastAPI(lifespan=mock_lifespan)
    app.include_router(applications.router)
    app.include_router(configurations.router)
    return app


def test_app_includes_applications_router():
    app = make_test_app()
    routes = [route.path for route in app.routes]
    assert "/api/v1/applications" in routes


def test_app_includes_configurations_router():
    app = make_test_app()
    routes = [route.path for route in app.routes]
    assert "/api/v1/configurations" in routes


def test_create_app_returns_fastapi_instance():
    with (
        patch("app.main.init_pool"),
        patch("app.main.close_pool"),
        patch("app.main.migrations.run"),
        patch("app.main.psycopg2.connect", return_value=MagicMock()),
        patch("app.main.get_settings", return_value=MagicMock(
            LOG_LEVEL="INFO",
            APP_ENV="test",
            DATABASE_URL="postgresql://user:pass@localhost/test",
        )),
    ):
        from fastapi import FastAPI

        from app.main import create_app

        result = create_app()
        assert isinstance(result, FastAPI)


@pytest.mark.asyncio
async def test_app_routes_respond():
    """Smoke test: routes exist and respond (with mocked dependencies)."""
    from app.database import get_db_cursor
    from app.models.application import ApplicationResponse

    mock_cursor = MagicMock()
    app = make_test_app()

    async def override_cursor():
        yield mock_cursor

    app.dependency_overrides[get_db_cursor] = override_cursor

    sample_app = ApplicationResponse(
        id="01ARZ3NDEKTSV4RRFFQ69G5FAV",
        name="test-app",
        configuration_ids=[],
    )

    with patch(
        "app.routers.applications.application_repository.get_by_id",
        return_value=sample_app,
    ):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get("/api/v1/applications/01ARZ3NDEKTSV4RRFFQ69G5FAV")

    assert response.status_code == 200
    assert response.json()["name"] == "test-app"
