import logging
from collections.abc import AsyncGenerator
from typing import Annotated

import psycopg2
from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.database import get_db_cursor
from app.models.configuration import (
    ConfigurationCreate,
    ConfigurationResponse,
    ConfigurationUpdate,
)
from app.repositories import configuration_repository

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["configurations"])


@router.get(
    "/configurations",
    response_model=list[ConfigurationResponse],
    status_code=status.HTTP_200_OK,
)
async def list_configurations(
    application_id: Annotated[str, Query(description="Filter by application ID")],
    cursor: Annotated[AsyncGenerator, Depends(get_db_cursor)],
) -> list[ConfigurationResponse]:
    """List all configurations for a given application."""
    return configuration_repository.list_by_application(cursor, application_id)


@router.post(
    "/configurations",
    response_model=ConfigurationResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_configuration(
    data: ConfigurationCreate,
    cursor: Annotated[AsyncGenerator, Depends(get_db_cursor)],
) -> ConfigurationResponse:
    """Create a new configuration."""
    try:
        return configuration_repository.create(cursor, data)
    except psycopg2.errors.UniqueViolation:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"Configuration with name '{data.name}' already exists "
                f"for application '{data.application_id}'."
            ),
        )
    except psycopg2.errors.ForeignKeyViolation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Application '{data.application_id}' not found.",
        )


@router.get(
    "/configurations/{configuration_id}",
    response_model=ConfigurationResponse,
    status_code=status.HTTP_200_OK,
)
async def get_configuration(
    configuration_id: str,
    cursor: Annotated[AsyncGenerator, Depends(get_db_cursor)],
) -> ConfigurationResponse:
    """Get a configuration by ID."""
    result = configuration_repository.get_by_id(cursor, configuration_id)
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Configuration '{configuration_id}' not found.",
        )
    return result


@router.delete(
    "/configurations/{configuration_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_configuration(
    configuration_id: str,
    cursor: Annotated[AsyncGenerator, Depends(get_db_cursor)],
) -> None:
    """Delete a configuration by ID."""
    deleted = configuration_repository.delete(cursor, configuration_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Configuration '{configuration_id}' not found.",
        )


@router.put(
    "/configurations/{configuration_id}",
    response_model=ConfigurationResponse,
    status_code=status.HTTP_200_OK,
)
async def update_configuration(
    configuration_id: str,
    data: ConfigurationUpdate,
    cursor: Annotated[AsyncGenerator, Depends(get_db_cursor)],
) -> ConfigurationResponse:
    """Update a configuration by ID."""
    try:
        result = configuration_repository.update(cursor, configuration_id, data)
    except psycopg2.errors.UniqueViolation:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Configuration with name '{data.name}' already exists for this application.",
        )
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Configuration '{configuration_id}' not found.",
        )
    return result
