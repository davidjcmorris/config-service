import pytest
from pydantic import ValidationError

from app.models.configuration import (
    ConfigurationCreate,
    ConfigurationResponse,
    ConfigurationUpdate,
)


def test_configuration_create_valid():
    cfg = ConfigurationCreate(
        application_id="01ARZ3NDEKTSV4RRFFQ69G5FAV",
        name="db-settings",
        comments="Database config",
        config={"host": "localhost", "port": 5432},
    )
    assert cfg.application_id == "01ARZ3NDEKTSV4RRFFQ69G5FAV"
    assert cfg.name == "db-settings"
    assert cfg.config == {"host": "localhost", "port": 5432}


def test_configuration_create_defaults():
    cfg = ConfigurationCreate(
        application_id="01ARZ3NDEKTSV4RRFFQ69G5FAV",
        name="db-settings",
    )
    assert cfg.comments is None
    assert cfg.config == {}


def test_configuration_create_requires_application_id():
    with pytest.raises(ValidationError):
        ConfigurationCreate(name="db-settings")


def test_configuration_create_requires_name():
    with pytest.raises(ValidationError):
        ConfigurationCreate(application_id="01ARZ3NDEKTSV4RRFFQ69G5FAV")


def test_configuration_update_all_optional():
    update = ConfigurationUpdate()
    assert update.name is None
    assert update.comments is None
    assert update.config is None


def test_configuration_update_partial():
    update = ConfigurationUpdate(config={"key": "value"})
    assert update.config == {"key": "value"}
    assert update.name is None


def test_configuration_response_defaults():
    resp = ConfigurationResponse(
        id="01ARZ3NDEKTSV4RRFFQ69G5FAV",
        application_id="01ARZ3NDEKTSV4RRFFQ69G5FAW",
        name="db-settings",
    )
    assert resp.comments is None
    assert resp.config == {}


def test_configuration_response_full():
    resp = ConfigurationResponse(
        id="01ARZ3NDEKTSV4RRFFQ69G5FAV",
        application_id="01ARZ3NDEKTSV4RRFFQ69G5FAW",
        name="db-settings",
        comments="My config",
        config={"env": "prod"},
    )
    assert resp.config == {"env": "prod"}
    assert resp.comments == "My config"
