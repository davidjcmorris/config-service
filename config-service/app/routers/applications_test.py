from unittest.mock import MagicMock, patch

import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient

from app.models.application import ApplicationResponse
from app.routers.applications import router

APP_ID = "01ARZ3NDEKTSV4RRFFQ69G5FAV"

SAMPLE_APP = ApplicationResponse(
    id=APP_ID,
    name="my-app",
    comments="A test app",
    configuration_ids=[],
)


def make_app(mock_cursor=None):
    """Create a test FastAPI app with the applications router and mocked DB."""
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
async def test_create_application_success():
    mock_cursor = MagicMock()

    with patch(
        "app.routers.applications.application_repository.create",
        return_value=SAMPLE_APP,
    ):
        app = make_app(mock_cursor)
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.post(
                "/api/v1/applications",
                json={"name": "my-app", "comments": "A test app"},
            )

    assert response.status_code == 201
    data = response.json()
    assert data["id"] == APP_ID
    assert data["name"] == "my-app"
    assert data["configuration_ids"] == []


@pytest.mark.asyncio
async def test_create_application_conflict():
    import psycopg2

    mock_cursor = MagicMock()

    with patch(
        "app.routers.applications.application_repository.create",
        side_effect=psycopg2.errors.UniqueViolation(),
    ):
        app = make_app(mock_cursor)
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.post(
                "/api/v1/applications",
                json={"name": "my-app"},
            )

    assert response.status_code == 409


@pytest.mark.asyncio
async def test_get_application_success():
    mock_cursor = MagicMock()

    with patch(
        "app.routers.applications.application_repository.get_by_id",
        return_value=SAMPLE_APP,
    ):
        app = make_app(mock_cursor)
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get(f"/api/v1/applications/{APP_ID}")

    assert response.status_code == 200
    assert response.json()["id"] == APP_ID


@pytest.mark.asyncio
async def test_get_application_not_found():
    mock_cursor = MagicMock()

    with patch(
        "app.routers.applications.application_repository.get_by_id",
        return_value=None,
    ):
        app = make_app(mock_cursor)
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get(f"/api/v1/applications/{APP_ID}")

    assert response.status_code == 404


@pytest.mark.asyncio
async def test_update_application_success():
    updated_app = ApplicationResponse(
        id=APP_ID,
        name="updated-app",
        comments=None,
        configuration_ids=[],
    )
    mock_cursor = MagicMock()

    with patch(
        "app.routers.applications.application_repository.update",
        return_value=updated_app,
    ):
        app = make_app(mock_cursor)
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.put(
                f"/api/v1/applications/{APP_ID}",
                json={"name": "updated-app"},
            )

    assert response.status_code == 200
    assert response.json()["name"] == "updated-app"


@pytest.mark.asyncio
async def test_update_application_not_found():
    mock_cursor = MagicMock()

    with patch(
        "app.routers.applications.application_repository.update",
        return_value=None,
    ):
        app = make_app(mock_cursor)
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.put(
                f"/api/v1/applications/{APP_ID}",
                json={"name": "updated-app"},
            )

    assert response.status_code == 404


@pytest.mark.asyncio
async def test_update_application_conflict():
    import psycopg2

    mock_cursor = MagicMock()

    with patch(
        "app.routers.applications.application_repository.update",
        side_effect=psycopg2.errors.UniqueViolation(),
    ):
        app = make_app(mock_cursor)
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.put(
                f"/api/v1/applications/{APP_ID}",
                json={"name": "duplicate-name"},
            )

    assert response.status_code == 409


@pytest.mark.asyncio
async def test_list_applications_success():
    mock_cursor = MagicMock()

    with patch(
        "app.routers.applications.application_repository.list_all",
        return_value=[SAMPLE_APP],
    ):
        app = make_app(mock_cursor)
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get("/api/v1/applications")

    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 1
    assert data[0]["id"] == APP_ID


@pytest.mark.asyncio
async def test_list_applications_empty():
    mock_cursor = MagicMock()

    with patch(
        "app.routers.applications.application_repository.list_all",
        return_value=[],
    ):
        app = make_app(mock_cursor)
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get("/api/v1/applications")

    assert response.status_code == 200
    assert response.json() == []


@pytest.mark.asyncio
async def test_delete_application_success():
    mock_cursor = MagicMock()

    with patch(
        "app.routers.applications.application_repository.delete",
        return_value=True,
    ):
        app = make_app(mock_cursor)
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.delete(f"/api/v1/applications/{APP_ID}")

    assert response.status_code == 204


@pytest.mark.asyncio
async def test_delete_application_not_found():
    mock_cursor = MagicMock()

    with patch(
        "app.routers.applications.application_repository.delete",
        return_value=False,
    ):
        app = make_app(mock_cursor)
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.delete(f"/api/v1/applications/{APP_ID}")

    assert response.status_code == 404
