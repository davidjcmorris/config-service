import logging
from collections.abc import AsyncGenerator
from typing import Annotated

import psycopg2
from fastapi import APIRouter, Depends, HTTPException, status

from app.database import get_db_cursor
from app.models.application import (
    ApplicationCreate,
    ApplicationResponse,
    ApplicationUpdate,
)
from app.repositories import application_repository

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["applications"])


@router.post(
    "/applications",
    response_model=ApplicationResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_application(
    data: ApplicationCreate,
    cursor: Annotated[AsyncGenerator, Depends(get_db_cursor)],
) -> ApplicationResponse:
    """Create a new application."""
    try:
        return application_repository.create(cursor, data)
    except psycopg2.errors.UniqueViolation:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Application with name '{data.name}' already exists.",
        )


@router.get(
    "/applications/{application_id}",
    response_model=ApplicationResponse,
    status_code=status.HTTP_200_OK,
)
async def get_application(
    application_id: str,
    cursor: Annotated[AsyncGenerator, Depends(get_db_cursor)],
) -> ApplicationResponse:
    """Get an application by ID."""
    result = application_repository.get_by_id(cursor, application_id)
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Application '{application_id}' not found.",
        )
    return result


@router.put(
    "/applications/{application_id}",
    response_model=ApplicationResponse,
    status_code=status.HTTP_200_OK,
)
async def update_application(
    application_id: str,
    data: ApplicationUpdate,
    cursor: Annotated[AsyncGenerator, Depends(get_db_cursor)],
) -> ApplicationResponse:
    """Update an application by ID."""
    try:
        result = application_repository.update(cursor, application_id, data)
    except psycopg2.errors.UniqueViolation:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Application with name '{data.name}' already exists.",
        )
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Application '{application_id}' not found.",
        )
    return result
