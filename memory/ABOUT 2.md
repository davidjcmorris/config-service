# About This Project

## What It Is

A **configuration management service** — a centralized store that allows applications to register themselves and store named configuration values. It consists of two components that work together:

- **`config-service/`** — A Python REST API backend
- **`ui/`** — A TypeScript Web Components admin UI

## Purpose

The service solves the problem of scattered, hard-coded configuration across multiple applications. Instead, each application registers with the config service and stores its configuration as named key-value sets. Administrators manage applications and their configurations through the admin UI; client applications retrieve configuration values via the REST API.

## Domain Model

There are two core entities:

### Application
Represents a named group of configurations — typically one per client application.

| Field | Type | Notes |
|-------|------|-------|
| `id` | ULID string | Primary key, auto-generated |
| `name` | string | Unique, required |
| `comments` | string \| null | Optional description |
| `configuration_ids` | string[] | IDs of associated configurations (read-only, derived) |

### Configuration
A named configuration set scoped to an application. The `config` field holds an arbitrary JSON object.

| Field | Type | Notes |
|-------|------|-------|
| `id` | ULID string | Primary key, auto-generated |
| `application_id` | ULID string | Foreign key → Application |
| `name` | string | Unique per application |
| `comments` | string \| null | Optional description |
| `config` | JSON object | Arbitrary key-value configuration data |

**Constraints:**
- Application names are globally unique
- Configuration names are unique within an application
- Deleting an application cascade-deletes all its configurations

## Scope

**In scope:**
- Full CRUD for Applications and Configurations via REST API
- Admin UI for managing both entities
- Automatic database migrations on service startup

**Out of scope:**
- Authentication / authorisation
- Configuration versioning or history
- Client SDKs
- Bulk operations
