from unittest.mock import MagicMock, patch

from app.models.configuration import ConfigurationCreate, ConfigurationUpdate
from app.repositories import configuration_repository


def make_cursor(fetchone_return=None, fetchall_return=None):
    cursor = MagicMock()
    cursor.fetchone.return_value = fetchone_return
    cursor.fetchall.return_value = fetchall_return or []
    return cursor


APP_ID = "01ARZ3NDEKTSV4RRFFQ69G5FAV"
CFG_ID = "01ARZ3NDEKTSV4RRFFQ69G5FAW"


def test_create_returns_configuration_response():
    row = {
        "id": CFG_ID,
        "application_id": APP_ID,
        "name": "db-settings",
        "comments": None,
        "config": {"host": "localhost"},
    }
    cursor = make_cursor(fetchone_return=row)

    with patch("app.repositories.configuration_repository.ULID", return_value=CFG_ID):
        result = configuration_repository.create(
            cursor,
            ConfigurationCreate(
                application_id=APP_ID,
                name="db-settings",
                config={"host": "localhost"},
            ),
        )

    assert result.id == CFG_ID
    assert result.application_id == APP_ID
    assert result.name == "db-settings"
    assert result.config == {"host": "localhost"}
    assert result.comments is None


def test_create_with_empty_config():
    row = {
        "id": CFG_ID,
        "application_id": APP_ID,
        "name": "empty-cfg",
        "comments": None,
        "config": {},
    }
    cursor = make_cursor(fetchone_return=row)

    with patch("app.repositories.configuration_repository.ULID", return_value=CFG_ID):
        result = configuration_repository.create(
            cursor,
            ConfigurationCreate(application_id=APP_ID, name="empty-cfg"),
        )

    assert result.config == {}


def test_get_by_id_returns_configuration():
    row = {
        "id": CFG_ID,
        "application_id": APP_ID,
        "name": "db-settings",
        "comments": "My config",
        "config": {"env": "prod"},
    }
    cursor = make_cursor(fetchone_return=row)

    result = configuration_repository.get_by_id(cursor, CFG_ID)

    assert result is not None
    assert result.id == CFG_ID
    assert result.config == {"env": "prod"}
    assert result.comments == "My config"


def test_get_by_id_returns_none_when_not_found():
    cursor = make_cursor(fetchone_return=None)

    result = configuration_repository.get_by_id(cursor, "nonexistent-id")

    assert result is None


def test_get_by_id_handles_json_string_config():
    row = {
        "id": CFG_ID,
        "application_id": APP_ID,
        "name": "db-settings",
        "comments": None,
        "config": '{"key": "value"}',
    }
    cursor = make_cursor(fetchone_return=row)

    result = configuration_repository.get_by_id(cursor, CFG_ID)

    assert result.config == {"key": "value"}


def test_update_returns_updated_configuration():
    updated_row = {
        "id": CFG_ID,
        "application_id": APP_ID,
        "name": "new-name",
        "comments": None,
        "config": {"updated": True},
    }
    cursor = make_cursor(fetchone_return=updated_row)

    result = configuration_repository.update(
        cursor,
        CFG_ID,
        ConfigurationUpdate(name="new-name", config={"updated": True}),
    )

    assert result is not None
    assert result.name == "new-name"
    assert result.config == {"updated": True}


def test_update_returns_none_when_not_found():
    cursor = make_cursor(fetchone_return=None)

    result = configuration_repository.update(
        cursor, "nonexistent-id", ConfigurationUpdate(name="new-name")
    )

    assert result is None


def test_update_no_fields_calls_get_by_id():
    row = {
        "id": CFG_ID,
        "application_id": APP_ID,
        "name": "db-settings",
        "comments": None,
        "config": {},
    }
    cursor = make_cursor(fetchone_return=row)

    result = configuration_repository.update(cursor, CFG_ID, ConfigurationUpdate())

    assert result is not None
    assert result.name == "db-settings"
