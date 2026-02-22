from unittest.mock import MagicMock, patch

from app.models.application import ApplicationCreate, ApplicationUpdate
from app.repositories import application_repository


def make_cursor(fetchone_return=None, fetchall_return=None):
    cursor = MagicMock()
    cursor.fetchone.return_value = fetchone_return
    cursor.fetchall.return_value = fetchall_return or []
    return cursor


def test_create_returns_application_response():
    row = {"id": "01ARZ3NDEKTSV4RRFFQ69G5FAV", "name": "my-app", "comments": None}
    cursor = make_cursor(fetchone_return=row)

    with patch("app.repositories.application_repository.ULID", return_value="01ARZ3NDEKTSV4RRFFQ69G5FAV"):
        result = application_repository.create(cursor, ApplicationCreate(name="my-app"))

    assert result.id == "01ARZ3NDEKTSV4RRFFQ69G5FAV"
    assert result.name == "my-app"
    assert result.comments is None
    assert result.configuration_ids == []
    cursor.execute.assert_called_once()


def test_create_with_comments():
    row = {"id": "01ARZ3NDEKTSV4RRFFQ69G5FAV", "name": "my-app", "comments": "A comment"}
    cursor = make_cursor(fetchone_return=row)

    with patch("app.repositories.application_repository.ULID", return_value="01ARZ3NDEKTSV4RRFFQ69G5FAV"):
        result = application_repository.create(
            cursor, ApplicationCreate(name="my-app", comments="A comment")
        )

    assert result.comments == "A comment"


def test_get_by_id_returns_application():
    row = {
        "id": "01ARZ3NDEKTSV4RRFFQ69G5FAV",
        "name": "my-app",
        "comments": None,
        "configuration_ids": ["01ARZ3NDEKTSV4RRFFQ69G5FAW"],
    }
    cursor = make_cursor(fetchone_return=row)

    result = application_repository.get_by_id(cursor, "01ARZ3NDEKTSV4RRFFQ69G5FAV")

    assert result is not None
    assert result.id == "01ARZ3NDEKTSV4RRFFQ69G5FAV"
    assert result.configuration_ids == ["01ARZ3NDEKTSV4RRFFQ69G5FAW"]


def test_get_by_id_returns_none_when_not_found():
    cursor = make_cursor(fetchone_return=None)

    result = application_repository.get_by_id(cursor, "nonexistent-id")

    assert result is None


def test_get_by_id_empty_configuration_ids():
    row = {
        "id": "01ARZ3NDEKTSV4RRFFQ69G5FAV",
        "name": "my-app",
        "comments": None,
        "configuration_ids": [],
    }
    cursor = make_cursor(fetchone_return=row)

    result = application_repository.get_by_id(cursor, "01ARZ3NDEKTSV4RRFFQ69G5FAV")

    assert result.configuration_ids == []


def test_update_returns_updated_application():
    updated_row = {"id": "01ARZ3NDEKTSV4RRFFQ69G5FAV", "name": "new-name", "comments": None}
    config_rows = [{"id": "01ARZ3NDEKTSV4RRFFQ69G5FAW"}]

    cursor = MagicMock()
    cursor.fetchone.return_value = updated_row
    cursor.fetchall.return_value = config_rows

    result = application_repository.update(
        cursor, "01ARZ3NDEKTSV4RRFFQ69G5FAV", ApplicationUpdate(name="new-name")
    )

    assert result is not None
    assert result.name == "new-name"
    assert result.configuration_ids == ["01ARZ3NDEKTSV4RRFFQ69G5FAW"]


def test_update_returns_none_when_not_found():
    cursor = make_cursor(fetchone_return=None)

    result = application_repository.update(
        cursor, "nonexistent-id", ApplicationUpdate(name="new-name")
    )

    assert result is None


def test_update_no_fields_calls_get_by_id():
    row = {
        "id": "01ARZ3NDEKTSV4RRFFQ69G5FAV",
        "name": "my-app",
        "comments": None,
        "configuration_ids": [],
    }
    cursor = make_cursor(fetchone_return=row)

    result = application_repository.update(
        cursor, "01ARZ3NDEKTSV4RRFFQ69G5FAV", ApplicationUpdate()
    )

    assert result is not None
    assert result.name == "my-app"
