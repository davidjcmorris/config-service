import json
from typing import Any

from ulid import ULID

from app.models.configuration import (
    ConfigurationCreate,
    ConfigurationResponse,
    ConfigurationUpdate,
)


def _row_to_response(row: dict[str, Any]) -> ConfigurationResponse:
    """Convert a database row dict to a ConfigurationResponse."""
    config = row.get("config") or {}
    # psycopg2 with RealDictCursor returns JSONB as a dict already,
    # but handle string case defensively
    if isinstance(config, str):
        config = json.loads(config)

    return ConfigurationResponse(
        id=row["id"],
        application_id=row["application_id"],
        name=row["name"],
        comments=row.get("comments"),
        config=config,
    )


def create(cursor: Any, data: ConfigurationCreate) -> ConfigurationResponse:
    """Insert a new configuration and return the created record."""
    new_id = str(ULID())
    cursor.execute(
        """
        INSERT INTO configurations (id, application_id, name, comments, config)
        VALUES (%s, %s, %s, %s, %s)
        RETURNING id, application_id, name, comments, config
        """,
        (new_id, data.application_id, data.name, data.comments, json.dumps(data.config)),
    )
    row = dict(cursor.fetchone())
    return _row_to_response(row)


def get_by_id(cursor: Any, configuration_id: str) -> ConfigurationResponse | None:
    """Fetch a configuration by ID."""
    cursor.execute(
        """
        SELECT id, application_id, name, comments, config
        FROM configurations
        WHERE id = %s
        """,
        (configuration_id,),
    )
    row = cursor.fetchone()
    if row is None:
        return None
    return _row_to_response(dict(row))


def list_by_application(cursor: Any, application_id: str) -> list[ConfigurationResponse]:
    """Fetch all configurations for a given application, ordered by name."""
    cursor.execute(
        """
        SELECT id, application_id, name, comments, config
        FROM configurations
        WHERE application_id = %s
        ORDER BY name
        """,
        (application_id,),
    )
    rows = cursor.fetchall()
    return [_row_to_response(dict(row)) for row in rows]


def delete(cursor: Any, configuration_id: str) -> bool:
    """Delete a configuration by ID. Returns True if deleted, False if not found."""
    cursor.execute(
        "DELETE FROM configurations WHERE id = %s",
        (configuration_id,),
    )
    return cursor.rowcount > 0


def update(
    cursor: Any, configuration_id: str, data: ConfigurationUpdate
) -> ConfigurationResponse | None:
    """Update a configuration's fields and return the updated record."""
    fields = {k: v for k, v in data.model_dump().items() if v is not None}
    if not fields:
        return get_by_id(cursor, configuration_id)

    # Serialize config to JSON string if present
    if "config" in fields:
        fields["config"] = json.dumps(fields["config"])

    set_clause = ", ".join(f"{key} = %s" for key in fields)
    values = list(fields.values()) + [configuration_id]

    cursor.execute(
        f"""
        UPDATE configurations
        SET {set_clause}
        WHERE id = %s
        RETURNING id, application_id, name, comments, config
        """,
        values,
    )
    row = cursor.fetchone()
    if row is None:
        return None
    return _row_to_response(dict(row))
