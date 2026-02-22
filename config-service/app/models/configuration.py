from typing import Any

from pydantic import BaseModel


class ConfigurationCreate(BaseModel):
    application_id: str
    name: str
    comments: str | None = None
    config: dict[str, Any] = {}


class ConfigurationUpdate(BaseModel):
    name: str | None = None
    comments: str | None = None
    config: dict[str, Any] | None = None


class ConfigurationResponse(BaseModel):
    id: str
    application_id: str
    name: str
    comments: str | None = None
    config: dict[str, Any] = {}
