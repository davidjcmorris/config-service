# Plan: TypeScript Client Library for config-service

## Overview

Create a standalone TypeScript client library (`client-lib/`) that provides a clean, typed abstraction over the config-service REST API. The library will be the single source of truth for API interaction — the admin UI will be updated to use it as its first consumer, replacing the existing `ui/src/api/` folder.

---

## Goals

1. Extract and generalise the API layer already proven in the admin UI into a reusable library
2. Provide typed interfaces for all domain entities and request/response shapes
3. Handle errors consistently using the same `ApiError` pattern already established
4. Require zero runtime dependencies (native `fetch` only)
5. Be independently testable with Vitest
6. Allow the base URL to be configured at instantiation time (so it works in both browser and Node environments, and against any host)

---

## Library design

### Instantiation pattern

The library exports a factory function (or class) that accepts a base URL and returns a client instance. This is the key difference from the current UI implementation, which hard-codes `/api/v1` as a relative path. The library must work from any origin.

```typescript
import { createConfigServiceClient } from '@config-service/client';

const client = createConfigServiceClient('http://localhost:8000');

const apps = await client.applications.list();
```

### Namespace structure

The client instance exposes two namespaces matching the API's resource structure:

```typescript
client.applications.list()
client.applications.get(id)
client.applications.create(data)
client.applications.update(id, data)
client.applications.delete(id)

client.configurations.list(applicationId)
client.configurations.get(id)
client.configurations.create(data)
client.configurations.update(id, data)
client.configurations.delete(id)
```

### Error handling

The library re-exports `ApiError` and `friendlyErrorMessage` from the existing UI pattern — these are moved into the library and the UI imports them from there instead.

```typescript
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly detail: string,
  ) { ... }
}

export function friendlyErrorMessage(err: unknown): string { ... }
```

---

## File structure

```
client-lib/
├── package.json              # name: "@config-service/client", private: true
├── tsconfig.json             # ESNext modules, strict, declaration output
├── src/
│   ├── index.ts              # Public exports: createConfigServiceClient, ApiError, friendlyErrorMessage, types
│   ├── client.ts             # Internal fetch wrapper (get/post/put/del) — accepts baseUrl
│   ├── types.ts              # Application, Configuration, and request/response interfaces
│   ├── applications.ts       # ApplicationsClient — list, get, create, update, delete
│   └── configurations.ts     # ConfigurationsClient — list, get, create, update, delete
└── tests/
    ├── client.test.ts        # fetch wrapper: error handling, 204, headers
    ├── applications.test.ts  # ApplicationsClient: all methods, correct URLs, payloads
    └── configurations.test.ts # ConfigurationsClient: all methods, query param encoding
```

---

## Typed interfaces

### Domain types (moved from `ui/src/types/models.ts`)

```typescript
export interface Application {
  id: string;
  name: string;
  comments: string | null;
  configuration_ids: string[];
}

export interface Configuration {
  id: string;
  application_id: string;
  name: string;
  comments: string | null;
  config: Record<string, unknown>;
}
```

### Request types

```typescript
export interface ApplicationCreate {
  name: string;
  comments?: string | null;
}

export interface ApplicationUpdate {
  name?: string;
  comments?: string | null;
}

export interface ConfigurationCreate {
  application_id: string;
  name: string;
  comments?: string | null;
  config?: Record<string, unknown>;
}

export interface ConfigurationUpdate {
  name?: string;
  comments?: string | null;
  config?: Record<string, unknown>;
}
```

---

## Internal fetch wrapper

The internal `client.ts` is a generalised version of the existing `ui/src/api/client.ts`, parameterised by `baseUrl`:

```typescript
// client-lib/src/client.ts
export function createHttpClient(baseUrl: string) {
  async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const url = `${baseUrl.replace(/\/$/, '')}${path}`;
    const init: RequestInit = { method };
    if (body !== undefined) {
      init.headers = { 'Content-Type': 'application/json' };
      init.body = JSON.stringify(body);
    }
    const response = await fetch(url, init);
    if (!response.ok) {
      let detail = `HTTP ${response.status}`;
      try {
        const err = (await response.json()) as { detail?: string };
        if (err.detail) detail = err.detail;
      } catch { /* ignore */ }
      throw new ApiError(response.status, detail);
    }
    if (response.status === 204) return undefined as T;
    return response.json() as Promise<T>;
  }

  return {
    get: <T>(path: string) => request<T>('GET', path),
    post: <T>(path: string, body: unknown) => request<T>('POST', path, body),
    put: <T>(path: string, body: unknown) => request<T>('PUT', path, body),
    del: (path: string) => request<void>('DELETE', path),
  };
}
```

---

## Public API surface (`src/index.ts`)

```typescript
export { ApiError, friendlyErrorMessage } from './errors.js';
export type { Application, Configuration, ApplicationCreate, ApplicationUpdate,
              ConfigurationCreate, ConfigurationUpdate } from './types.js';
export { createConfigServiceClient } from './factory.js';
```

---

## Package configuration

### `client-lib/package.json`

```json
{
  "name": "@config-service/client",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  },
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "devDependencies": {
    "typescript": "^5.7.3",
    "vitest": "^2.1.9"
  }
}
```

### `client-lib/tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "declaration": true,
    "outDir": "./dist"
  },
  "include": ["src"]
}
```

---

## Testing approach

Tests follow the same pattern as `ui/tests/unit/api-client.test.ts` — stub global `fetch` with `vi.stubGlobal`, restore in `afterEach`.

### `tests/client.test.ts`
- Returns parsed JSON on 2xx
- Returns `undefined` on 204
- Throws `ApiError` with correct `status` and `detail` on non-2xx
- Sets `Content-Type: application/json` on POST/PUT
- Serialises body as JSON
- Constructs full URL from baseUrl + path (strips trailing slash from baseUrl)

### `tests/applications.test.ts`
- `list()` → GET `/api/v1/applications`
- `get(id)` → GET `/api/v1/applications/{id}`
- `create(data)` → POST `/api/v1/applications` with correct body
- `update(id, data)` → PUT `/api/v1/applications/{id}` with correct body
- `delete(id)` → DELETE `/api/v1/applications/{id}`, returns `undefined`

### `tests/configurations.test.ts`
- `list(applicationId)` → GET `/api/v1/configurations?application_id=<encoded>`
- `get(id)` → GET `/api/v1/configurations/{id}`
- `create(data)` → POST `/api/v1/configurations` with correct body
- `update(id, data)` → PUT `/api/v1/configurations/{id}` with correct body
- `delete(id)` → DELETE `/api/v1/configurations/{id}`, returns `undefined`

---

## Admin UI migration

Once the library is in place, the UI's `src/api/` folder is replaced with thin re-exports from the library. The migration is a three-step change:

### Step 1 — Add workspace dependency

In `ui/package.json`, add the library as a workspace dependency:

```json
{
  "dependencies": {
    "@config-service/client": "workspace:*"
  }
}
```

And add the workspace to `ui/pnpm-workspace.yaml`:

```yaml
packages:
  - '.'
  - '../client-lib'
```

### Step 2 — Replace `ui/src/api/`

Delete the three existing files and replace with a single re-export barrel:

```typescript
// ui/src/api/index.ts  (replaces client.ts, applications.ts, configurations.ts)
export {
  ApiError,
  friendlyErrorMessage,
  createConfigServiceClient,
} from '@config-service/client';
export type {
  Application,
  Configuration,
  ApplicationCreate,
  ApplicationUpdate,
  ConfigurationCreate,
  ConfigurationUpdate,
} from '@config-service/client';

// Instantiate with the Vite dev proxy path (relative URL works in browser)
export const { applications, configurations } = createConfigServiceClient('/api/v1');
```

All component imports of `../../src/api/applications.js`, `../../src/api/configurations.js`, and `../../src/api/client.js` are updated to import from `../../src/api/index.js`.

### Step 3 — Update `ui/src/types/models.ts`

The `Application` and `Configuration` interfaces are now owned by the library. The UI's `models.ts` becomes a re-export:

```typescript
// ui/src/types/models.ts
export type { Application, Configuration } from '@config-service/client';
```

### Step 4 — Update unit test mocks

The Vitest unit tests currently mock `../../src/api/applications.js` and `../../src/api/configurations.js` directly. After migration, the mock paths remain the same (they still point to the UI's `src/api/` barrel), so **no test changes are required** — the mocks intercept at the same import boundary.

---

## Implementation order

1. Create `client-lib/` with `package.json`, `tsconfig.json`
2. Implement `src/errors.ts` (`ApiError`, `friendlyErrorMessage`)
3. Implement `src/types.ts` (all interfaces)
4. Implement `src/client.ts` (internal fetch wrapper)
5. Implement `src/applications.ts` and `src/configurations.ts`
6. Implement `src/index.ts` (public exports)
7. Write all tests in `tests/`
8. Verify tests pass (`vitest run`)
9. Add workspace link in `ui/pnpm-workspace.yaml` and `ui/package.json`
10. Run `pnpm install` in `ui/` to link the workspace package
11. Replace `ui/src/api/` with the barrel re-export
12. Update `ui/src/types/models.ts` to re-export from the library
13. Run `pnpm test:unit` in `ui/` to verify no regressions

---

## Constraints and decisions

| Decision | Rationale |
|---|---|
| No runtime dependencies | Matches the UI's philosophy; `fetch` is available in all modern browsers and Node ≥18 |
| Factory function, not singleton | Allows different base URLs in tests vs production; avoids module-level side effects |
| `private: true` in package.json | This is an internal monorepo package, not published to npm |
| Tests stub `fetch` globally | Same pattern as the existing UI tests — no HTTP mocking library needed |
| UI barrel re-export pattern | Keeps component import paths stable; only the barrel changes, not every component |
| `workspace:*` protocol | pnpm workspace protocol — resolves to the local package without publishing |
