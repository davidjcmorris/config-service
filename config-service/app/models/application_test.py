import pytest
from pydantic import ValidationError

from app.models.application import (
    ApplicationCreate,
    ApplicationResponse,
    ApplicationUpdate,
)


def test_application_create_valid():
    app = ApplicationCreate(name="my-app", comments="A test app")
    assert app.name == "my-app"
    assert app.comments == "A test app"


def test_application_create_comments_optional():
    app = ApplicationCreate(name="my-app")
    assert app.comments is None


def test_application_create_requires_name():
    with pytest.raises(ValidationError):
        ApplicationCreate()


def test_application_update_all_optional():
    update = ApplicationUpdate()
    assert update.name is None
    assert update.comments is None


def test_application_update_partial():
    update = ApplicationUpdate(name="new-name")
    assert update.name == "new-name"
    assert update.comments is None


def test_application_response_defaults():
    resp = ApplicationResponse(id="01ARZ3NDEKTSV4RRFFQ69G5FAV", name="my-app")
    assert resp.id == "01ARZ3NDEKTSV4RRFFQ69G5FAV"
    assert resp.name == "my-app"
    assert resp.comments is None
    assert resp.configuration_ids == []


def test_application_response_with_config_ids():
    resp = ApplicationResponse(
        id="01ARZ3NDEKTSV4RRFFQ69G5FAV",
        name="my-app",
        configuration_ids=["01ARZ3NDEKTSV4RRFFQ69G5FAW", "01ARZ3NDEKTSV4RRFFQ69G5FAX"],
    )
    assert len(resp.configuration_ids) == 2
