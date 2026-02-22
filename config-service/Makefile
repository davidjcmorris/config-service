.PHONY: install run test lint

install:
	uv sync

run:
	uv run python -m uvicorn app.main:app --reload

test:
	uv run python -m pytest

lint:
	uv run python -m ruff check .
