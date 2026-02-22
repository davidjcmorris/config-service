from pydantic import BaseModel


class ApplicationCreate(BaseModel):
    name: str
    comments: str | None = None


class ApplicationUpdate(BaseModel):
    name: str | None = None
    comments: str | None = None


class ApplicationResponse(BaseModel):
    id: str
    name: str
    comments: str | None = None
    configuration_ids: list[str] = []
