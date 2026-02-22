from unittest.mock import MagicMock, patch

import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient

from app.models.configuration import ConfigurationResponse
from app.routers.configurations import router

APP_ID = "01ARZ3NDEKTSV4RRFFQ69G5FAV"
CFG_ID = "01ARZ3NDEKTSV4RRFFQ69G5FAW"

SAMPLE_CFG = ConfigurationResponse(
    id=CFG_ID,
    application_id=APP_ID,
    name="db-settings",
    comments="Database config",
    config={"host": "localhost", "port": 5432},
)


def make_app(mock_cursor=None):
    """Create a test FastAPI app with the configurations router and mocked DB."""
    app = FastAPI()

    if mock_cursor is None:
        mock_cursor = MagicMock()

    async def override_get_db_cursor():
        yield mock_cursor

    from app.database import get_db_cursor

    app.dependency_overrides[get_db_cursor] = override_get_db_cursor
    app.include_router(router)
    return app


@pytest.mark.asyncio
async def test_create_configuration_success():
    mock_cursor = MagicMock()

    with patch(
        "app.routers.configurations.configuration_repository.create",
        return_value=SAMPLE_CFG,
    ):
        app = make_app(mock_cursor)
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.post(
                "/api/v1/configurations",
                json={
                    "application_id": APP_ID,
                    "name": "db-settings",
                    "comments": "Database config",
                    "config": {"host": "localhost", "port": 5432},
                },
            )

    assert response.status_code == 201
    data = response.json()
    assert data["id"] == CFG_ID
    assert data["application_id"] == APP_ID
    assert data["config"] == {"host": "localhost", "port": 5432}


@pytest.mark.asyncio
async def test_create_configuration_conflict():
    import psycopg2

    mock_cursor = MagicMock()

    with patch(
        "app.routers.configurations.configuration_repository.create",
        side_effect=psycopg2.errors.UniqueViolation(),
    ):
        app = make_app(mock_cursor)
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.post(
                "/api/v1/configurations",
                json={"application_id": APP_ID, "name": "db-settings"},
            )

    assert response.status_code == 409


@pytest.mark.asyncio
async def test_create_configuration_app_not_found():
    import psycopg2

    mock_cursor = MagicMock()

    with patch(
        "app.routers.configurations.configuration_repository.create",
        side_effect=psycopg2.errors.ForeignKeyViolation(),
    ):
        app = make_app(mock_cursor)
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.post(
                "/api/v1/configurations",
                json={"application_id": "nonexistent", "name": "db-settings"},
            )

    assert response.status_code == 404


@pytest.mark.asyncio
async def test_get_configuration_success():
    mock_cursor = MagicMock()

    with patch(
        "app.routers.configurations.configuration_repository.get_by_id",
        return_value=SAMPLE_CFG,
    ):
        app = make_app(mock_cursor)
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get(f"/api/v1/configurations/{CFG_ID}")

    assert response.status_code == 200
    assert response.json()["id"] == CFG_ID


@pytest.mark.asyncio
async def test_get_configuration_not_found():
    mock_cursor = MagicMock()

    with patch(
        "app.routers.configurations.configuration_repository.get_by_id",
        return_value=None,
    ):
        app = make_app(mock_cursor)
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get(f"/api/v1/configurations/{CFG_ID}")

    assert response.status_code == 404


@pytest.mark.asyncio
async def test_update_configuration_success():
    updated_cfg = ConfigurationResponse(
        id=CFG_ID,
        application_id=APP_ID,
        name="updated-settings",
        comments=None,
        config={"env": "prod"},
    )
    mock_cursor = MagicMock()

    with patch(
        "app.routers.configurations.configuration_repository.update",
        return_value=updated_cfg,
    ):
        app = make_app(mock_cursor)
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.put(
                f"/api/v1/configurations/{CFG_ID}",
                json={"name": "updated-settings", "config": {"env": "prod"}},
            )

    assert response.status_code == 200
    assert response.json()["name"] == "updated-settings"
    assert response.json()["config"] == {"env": "prod"}


@pytest.mark.asyncio
async def test_update_configuration_not_found():
    mock_cursor = MagicMock()

    with patch(
        "app.routers.configurations.configuration_repository.update",
        return_value=None,
    ):
        app = make_app(mock_cursor)
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.put(
                f"/api/v1/configurations/{CFG_ID}",
                json={"name": "updated-settings"},
            )

    assert response.status_code == 404


@pytest.mark.asyncio
async def test_update_configuration_conflict():
    import psycopg2

    mock_cursor = MagicMock()

    with patch(
        "app.routers.configurations.configuration_repository.update",
        side_effect=psycopg2.errors.UniqueViolation(),
    ):
        app = make_app(mock_cursor)
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.put(
                f"/api/v1/configurations/{CFG_ID}",
                json={"name": "duplicate-name"},
            )

    assert response.status_code == 409
