from typing import Any

from ulid import ULID

from app.models.application import (
    ApplicationCreate,
    ApplicationResponse,
    ApplicationUpdate,
)


def _row_to_response(row: dict[str, Any]) -> ApplicationResponse:
    """Convert a database row dict to an ApplicationResponse."""
    config_ids_raw = row.get("configuration_ids") or []
    # config_ids_raw may be a comma-separated string from STRING_AGG or a list
    if isinstance(config_ids_raw, str):
        configuration_ids = [cid.strip() for cid in config_ids_raw.split(",") if cid.strip()]
    else:
        configuration_ids = list(config_ids_raw)

    return ApplicationResponse(
        id=row["id"],
        name=row["name"],
        comments=row.get("comments"),
        configuration_ids=configuration_ids,
    )


def create(cursor: Any, data: ApplicationCreate) -> ApplicationResponse:
    """Insert a new application and return the created record."""
    new_id = str(ULID())
    cursor.execute(
        """
        INSERT INTO applications (id, name, comments)
        VALUES (%s, %s, %s)
        RETURNING id, name, comments
        """,
        (new_id, data.name, data.comments),
    )
    row = dict(cursor.fetchone())
    row["configuration_ids"] = []
    return ApplicationResponse(**row)


def get_by_id(cursor: Any, application_id: str) -> ApplicationResponse | None:
    """Fetch an application by ID, including its configuration IDs."""
    cursor.execute(
        """
        SELECT
            a.id,
            a.name,
            a.comments,
            COALESCE(
                ARRAY_AGG(c.id ORDER BY c.id) FILTER (WHERE c.id IS NOT NULL),
                ARRAY[]::VARCHAR[]
            ) AS configuration_ids
        FROM applications a
        LEFT JOIN configurations c ON c.application_id = a.id
        WHERE a.id = %s
        GROUP BY a.id, a.name, a.comments
        """,
        (application_id,),
    )
    row = cursor.fetchone()
    if row is None:
        return None
    return _row_to_response(dict(row))


def list_all(cursor: Any) -> list[ApplicationResponse]:
    """Fetch all applications ordered by name, including their configuration IDs."""
    cursor.execute(
        """
        SELECT
            a.id,
            a.name,
            a.comments,
            COALESCE(
                ARRAY_AGG(c.id ORDER BY c.id) FILTER (WHERE c.id IS NOT NULL),
                ARRAY[]::VARCHAR[]
            ) AS configuration_ids
        FROM applications a
        LEFT JOIN configurations c ON c.application_id = a.id
        GROUP BY a.id, a.name, a.comments
        ORDER BY a.name
        """,
    )
    rows = cursor.fetchall()
    return [_row_to_response(dict(row)) for row in rows]


def delete(cursor: Any, application_id: str) -> bool:
    """Delete an application by ID. Returns True if deleted, False if not found."""
    cursor.execute(
        "DELETE FROM applications WHERE id = %s",
        (application_id,),
    )
    return cursor.rowcount > 0


def update(cursor: Any, application_id: str, data: ApplicationUpdate) -> ApplicationResponse | None:
    """Update an application's fields and return the updated record."""
    # Build SET clause dynamically from non-None fields
    fields = {k: v for k, v in data.model_dump().items() if v is not None}
    if not fields:
        return get_by_id(cursor, application_id)

    set_clause = ", ".join(f"{key} = %s" for key in fields)
    values = list(fields.values()) + [application_id]

    cursor.execute(
        f"""
        UPDATE applications
        SET {set_clause}
        WHERE id = %s
        RETURNING id, name, comments
        """,
        values,
    )
    row = cursor.fetchone()
    if row is None:
        return None

    # Fetch configuration_ids separately
    cursor.execute(
        "SELECT id FROM configurations WHERE application_id = %s ORDER BY id",
        (application_id,),
    )
    config_rows = cursor.fetchall()
    configuration_ids = [r["id"] for r in config_rows]

    result = dict(row)
    result["configuration_ids"] = configuration_ids
    return ApplicationResponse(**result)
