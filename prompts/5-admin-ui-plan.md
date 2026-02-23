# Admin UI Implementation Plan

## Overview

This plan describes the implementation of an admin web interface for managing applications and their configurations. The UI is a standalone TypeScript/HTML/CSS project using Web Components and the browser's native `fetch` API — no external frameworks or libraries.

---

## Part 1: Backend API Gaps

Before building the UI, the config-service API must be extended. The current API is missing:

- `GET /api/v1/applications` — list all applications
- `DELETE /api/v1/applications/{application_id}` — delete an application
- `GET /api/v1/configurations?application_id={id}` — list configurations for an application
- `DELETE /api/v1/configurations/{configuration_id}` — delete a configuration

### 1.1 Add list and delete to `application_repository.py`

**`list_all(cursor) -> list[ApplicationResponse]`**
```sql
SELECT
    a.id, a.name, a.comments,
    COALESCE(
        ARRAY_AGG(c.id ORDER BY c.id) FILTER (WHERE c.id IS NOT NULL),
        ARRAY[]::VARCHAR[]
    ) AS configuration_ids
FROM applications a
LEFT JOIN configurations c ON c.application_id = a.id
GROUP BY a.id, a.name, a.comments
ORDER BY a.name
```

**`delete(cursor, application_id) -> bool`**
```sql
DELETE FROM applications WHERE id = %s
```
Returns `True` if a row was deleted, `False` if not found.

### 1.2 Add list and delete to `configuration_repository.py`

**`list_by_application(cursor, application_id) -> list[ConfigurationResponse]`**
```sql
SELECT id, application_id, name, comments, config
FROM configurations
WHERE application_id = %s
ORDER BY name
```

**`delete(cursor, configuration_id) -> bool`**
```sql
DELETE FROM configurations WHERE id = %s
```
Returns `True` if a row was deleted, `False` if not found.

### 1.3 Add new routes to `applications.py`

```
GET    /api/v1/applications                  → list all applications (200)
DELETE /api/v1/applications/{application_id} → delete application (204 or 404)
```

### 1.4 Add new routes to `configurations.py`

```
GET    /api/v1/configurations?application_id={id} → list configurations for an app (200)
DELETE /api/v1/configurations/{configuration_id}  → delete configuration (204 or 404)
```

### 1.5 Add tests for new backend endpoints

Add pytest tests in `applications_test.py` and `configurations_test.py` covering:
- Successful list (returns array)
- Successful delete (204)
- Delete not found (404)

---

## Part 2: Project Structure

The UI lives in the `ui/` directory at the project root.

```
ui/
├── package.json
├── tsconfig.json
├── vite.config.ts          # dev server + build tool
├── playwright.config.ts    # integration test config
├── index.html              # app shell
├── src/
│   ├── main.ts             # entry point — registers all components
│   ├── api/
│   │   ├── client.ts       # fetch wrapper with error handling
│   │   ├── applications.ts # application API calls
│   │   └── configurations.ts # configuration API calls
│   ├── components/
│   │   ├── app-root.ts           # top-level shell component
│   │   ├── app-list.ts           # scrollable accordion list of applications
│   │   ├── app-form.ts           # add/edit application form
│   │   ├── config-form.ts        # add/edit configuration form
│   │   └── confirm-dialog.ts     # reusable confirmation dialog
│   ├── types/
│   │   └── models.ts       # TypeScript interfaces for Application & Configuration
│   └── styles/
│       └── global.css      # host-level styles (CSS custom properties / tokens)
├── tests/
│   ├── unit/
│   │   ├── api-client.test.ts
│   │   ├── app-list.test.ts
│   │   ├── app-form.test.ts
│   │   └── config-form.test.ts
│   └── integration/
│       ├── applications.spec.ts
│       └── configurations.spec.ts
```

---

## Part 3: Tooling & Configuration

### 3.1 `package.json`

```json
{
  "name": "admin-ui",
  "private": true,
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test:unit": "vitest run",
    "test:unit:watch": "vitest",
    "test:e2e": "playwright test",
    "test": "pnpm run test:unit && pnpm run test:e2e"
  },
  "devDependencies": {
    "typescript": "^5.x",
    "vite": "^5.x",
    "vitest": "^2.x",
    "@vitest/ui": "^2.x",
    "jsdom": "^25.x",
    "@playwright/test": "^1.x"
  }
}
```

> Use `pnpm install` and `pnpm run dev` to start the dev server.

### 3.2 `tsconfig.json`

- `target: "ES2022"`, `module: "ESNext"`, `moduleResolution: "bundler"`
- `strict: true`, `lib: ["ES2022", "DOM"]`

### 3.3 `vite.config.ts`

- Entry: `index.html`
- Dev server proxy: `/api` → `http://localhost:8000` (avoids CORS during development)
- Test environment: `jsdom` for unit tests

### 3.4 `playwright.config.ts`

- Base URL: `http://localhost:5173` (Vite dev server)
- `webServer` config to auto-start `pnpm run dev` before tests
- Browsers: Chromium (primary), optionally Firefox

---

## Part 4: TypeScript Types (`src/types/models.ts`)

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

export interface ApiError {
  detail: string;
}
```

---

## Part 5: API Client (`src/api/`)

### 5.1 `client.ts` — fetch wrapper

A thin wrapper around `fetch` that:
- Sets `Content-Type: application/json` on mutating requests
- Parses JSON responses
- On non-2xx responses, extracts the `detail` field from the error body and throws a typed `ApiError`
- Exports `get`, `post`, `put`, `del` helpers

```typescript
export class ApiError extends Error {
  constructor(public status: number, public detail: string) {
    super(detail);
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> { ... }

export const get  = <T>(path: string) => request<T>('GET', path);
export const post = <T>(path: string, body: unknown) => request<T>('POST', path, body);
export const put  = <T>(path: string, body: unknown) => request<T>('PUT', path, body);
export const del  = (path: string) => request<void>('DELETE', path);
```

### 5.2 `applications.ts`

```typescript
listApplications(): Promise<Application[]>
getApplication(id: string): Promise<Application>
createApplication(data: { name: string; comments?: string }): Promise<Application>
updateApplication(id: string, data: { name?: string; comments?: string }): Promise<Application>
deleteApplication(id: string): Promise<void>
```

### 5.3 `configurations.ts`

```typescript
listConfigurations(applicationId: string): Promise<Configuration[]>
getConfiguration(id: string): Promise<Configuration>
createConfiguration(data: { application_id: string; name: string; comments?: string; config?: object }): Promise<Configuration>
updateConfiguration(id: string, data: { name?: string; comments?: string; config?: object }): Promise<Configuration>
deleteConfiguration(id: string): Promise<void>
```

---

## Part 6: Web Components

All components extend `HTMLElement`, use Shadow DOM with `mode: 'open'`, and manage their own styles via `<style>` tags in the shadow root. State changes trigger re-renders by calling a private `render()` method. After any successful API mutation, the component re-fetches from the API rather than patching local state.

### 6.1 `<app-root>` (`src/components/app-root.ts`)

Top-level shell. Manages the current "view" (list, edit-app, edit-config) as a simple string state. Renders the appropriate child component and listens for custom events to navigate between views.

**Custom events listened to:**
- `navigate-to-app-form` (detail: `{ applicationId?: string }`) — show app form
- `navigate-to-config-form` (detail: `{ configurationId?: string; applicationId: string }`) — show config form
- `navigate-to-list` — return to main list

**Render logic:**
```
switch (this.view) {
  case 'list':    render <app-list>
  case 'app-form': render <app-form application-id="...">
  case 'config-form': render <config-form configuration-id="..." application-id="...">
}
```

### 6.2 `<app-list>` (`src/components/app-list.ts`)

Accordion list of all applications.

**State:**
- `applications: Application[]` — fetched on `connectedCallback`
- `expandedId: string | null` — which application is expanded
- `configurationsCache: Map<string, Configuration[]>` — lazy-loaded per app

**Render structure (Shadow DOM):**
```html
<style>/* scoped styles */</style>
<div class="toolbar">
  <button class="icon-btn add-app" title="Add application">＋</button>
</div>
<ul class="app-list">
  <!-- per application: -->
  <li class="app-item">
    <div class="app-row">
      <button class="icon-btn edit-app" title="Edit application">✎</button>
      <button class="app-name-btn">{name}</button>
    </div>
    <!-- if expanded: -->
    <div class="config-section">
      <button class="icon-btn add-config" title="Add configuration">＋</button>
      <ul class="config-list">
        <!-- per configuration: -->
        <li class="config-item">
          <button class="icon-btn edit-config" title="Edit configuration">✎</button>
          <span class="config-label">{name}: {JSON.stringify(config)}</span>
        </li>
      </ul>
    </div>
  </li>
</ul>
```

**Behaviour:**
- Clicking an app name button toggles expansion; if expanding and configs not cached, fetches `listConfigurations(appId)` and caches result
- Clicking the add-app button dispatches `navigate-to-app-form` with no `applicationId`
- Clicking an edit-app button dispatches `navigate-to-app-form` with `applicationId`
- Clicking add-config dispatches `navigate-to-config-form` with `applicationId` and no `configurationId`
- Clicking an edit-config button dispatches `navigate-to-config-form` with both IDs

### 6.3 `<app-form>` (`src/components/app-form.ts`)

Observed attributes: `application-id` (optional — absent means "create" mode).

**State:**
- `application: Application | null` — fetched on connect if `application-id` is set
- `errors: Record<string, string>` — field-level validation errors
- `apiError: string | null` — top-level API error message

**Render structure:**
```html
<style>/* scoped styles */</style>
<form>
  <div class="field">
    <label for="name">Name *</label>
    <input id="name" name="name" type="text" required>
    <span class="field-error" aria-live="polite"></span>
  </div>
  <div class="field">
    <label for="comments">Comments</label>
    <textarea id="comments" name="comments"></textarea>
  </div>

  <!-- Edit mode only: read-only config list -->
  <div class="config-section" hidden={createMode}>
    <h3>Configurations</h3>
    <button type="button" class="icon-btn add-config">＋ Add configuration</button>
    <ul class="config-list">
      <!-- {name}: {config} pairs, read-only -->
    </ul>
  </div>

  <div class="api-error" aria-live="assertive"></div>

  <div class="actions">
    <button type="submit">Save</button>
    <button type="button" class="cancel-btn">Cancel</button>
    <!-- Edit mode only: -->
    <button type="button" class="delete-btn" hidden={createMode}>Delete</button>
  </div>
</form>
```

**Behaviour:**
- On submit: validate `name` is non-empty; if invalid, show inline error and abort
- On save success: dispatch `navigate-to-list`
- On save API error: display `apiError` message
- Delete button opens `<confirm-dialog>`; on confirm calls `deleteApplication`, then dispatches `navigate-to-list`
- Cancel dispatches `navigate-to-list`
- Add configuration button dispatches `navigate-to-config-form` with `applicationId`

### 6.4 `<config-form>` (`src/components/config-form.ts`)

Observed attributes: `configuration-id` (optional), `application-id` (required).

**State:**
- `configuration: Configuration | null` — fetched on connect if `configuration-id` is set
- `errors: Record<string, string>`
- `apiError: string | null`

**Render structure:**
```html
<style>/* scoped styles */</style>
<form>
  <div class="field">
    <label for="name">Name *</label>
    <input id="name" name="name" type="text" required>
    <span class="field-error" aria-live="polite"></span>
  </div>
  <div class="field">
    <label for="config">Config (JSON) *</label>
    <textarea id="config" name="config" rows="8"></textarea>
    <span class="field-error" aria-live="polite"></span>
  </div>
  <div class="field">
    <label for="comments">Comments</label>
    <textarea id="comments" name="comments"></textarea>
  </div>

  <div class="api-error" aria-live="assertive"></div>

  <div class="actions">
    <button type="submit">Save</button>
    <button type="button" class="cancel-btn">Cancel</button>
    <!-- Edit mode only: -->
    <button type="button" class="delete-btn" hidden={createMode}>Delete</button>
  </div>
</form>
```

**Behaviour:**
- The `config` field is a `<textarea>` that accepts raw JSON; validated with `JSON.parse` before submit
- On submit: validate `name` non-empty and `config` is valid JSON; show inline errors if not
- On save success: dispatch `navigate-to-app-form` with `applicationId` (returns to app edit view)
- Delete button opens `<confirm-dialog>`; on confirm calls `deleteConfiguration`, then dispatches `navigate-to-app-form`
- Cancel dispatches `navigate-to-app-form` with `applicationId`

### 6.5 `<confirm-dialog>` (`src/components/confirm-dialog.ts`)

A reusable modal dialog using the native `<dialog>` element inside Shadow DOM.

**API (used programmatically):**
```typescript
dialog.open(message: string): Promise<boolean>
// resolves true if confirmed, false if cancelled
```

**Render structure:**
```html
<style>/* scoped styles — backdrop via ::backdrop */</style>
<dialog>
  <p class="message"></p>
  <div class="actions">
    <button class="confirm-btn">Delete</button>
    <button class="cancel-btn">Cancel</button>
  </div>
</dialog>
```

---

## Part 7: Styling

### Approach
- Each component's Shadow DOM contains a `<style>` block with scoped CSS
- CSS custom properties (variables) are defined on `:host` in each component and can be overridden from the light DOM via `--` properties
- A minimal `global.css` sets base font, colour tokens, and resets on the document body
- No external CSS frameworks

### Design tokens (defined in `global.css` on `:root`)
```css
:root {
  --color-primary: #2563eb;
  --color-danger: #dc2626;
  --color-surface: #ffffff;
  --color-border: #e5e7eb;
  --color-text: #111827;
  --color-text-muted: #6b7280;
  --radius: 6px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --font-family: system-ui, sans-serif;
}
```

### Key UI patterns
- **Accordion rows**: flex layout, hover highlight, chevron/icon rotation on expand
- **Icon buttons**: 32×32px, borderless, cursor pointer, accessible `title` attribute
- **Forms**: stacked labels above inputs, red inline error text below invalid fields
- **Error banner**: yellow/red banner at top of form for API errors
- **Confirm dialog**: centred modal with backdrop blur, destructive action styled in red

---

## Part 8: Unit Testing (Vitest)

Unit tests run in a `jsdom` environment. Each component is instantiated, appended to `document.body`, and its shadow root is queried.

### Test setup
- `vitest.config.ts` sets `environment: 'jsdom'`
- API modules are mocked using `vi.mock`

### `tests/unit/api-client.test.ts`
- Mocks `globalThis.fetch`
- Tests: successful GET returns parsed JSON; non-2xx throws `ApiError` with correct status and detail; POST sends correct headers and body

### `tests/unit/app-list.test.ts`
- Mocks `listApplications` and `listConfigurations`
- Tests:
  - Renders application names
  - Clicking an app name expands it and fetches configurations
  - Clicking again collapses it
  - Add-app button dispatches `navigate-to-app-form` event
  - Edit-app button dispatches `navigate-to-app-form` with correct `applicationId`
  - Add-config button dispatches `navigate-to-config-form` with correct `applicationId`

### `tests/unit/app-form.test.ts`
- Mocks `getApplication`, `createApplication`, `updateApplication`, `deleteApplication`
- Tests:
  - Create mode: form renders without delete button and without config list
  - Edit mode: form pre-fills name and comments; shows config list
  - Validation: empty name shows inline error, does not call API
  - Save (create): calls `createApplication`, dispatches `navigate-to-list`
  - Save (update): calls `updateApplication`, dispatches `navigate-to-list`
  - API error: displays error message in banner
  - Delete: opens confirm dialog; on confirm calls `deleteApplication`; dispatches `navigate-to-list`
  - Cancel: dispatches `navigate-to-list`

### `tests/unit/config-form.test.ts`
- Mocks `getConfiguration`, `createConfiguration`, `updateConfiguration`, `deleteConfiguration`
- Tests:
  - Create mode: form renders without delete button
  - Edit mode: pre-fills name, config (as JSON string), comments
  - Validation: empty name shows error; invalid JSON in config shows error
  - Save (create): calls `createConfiguration` with parsed JSON config
  - Save (update): calls `updateConfiguration`
  - API error: displays error message
  - Delete: confirm → `deleteConfiguration` → dispatches `navigate-to-app-form`
  - Cancel: dispatches `navigate-to-app-form`

---

## Part 9: Integration Testing (Playwright)

Integration tests run against the live Vite dev server with the real config-service API running at `http://localhost:8000`.

### `tests/integration/applications.spec.ts`

**Setup:** Each test creates a unique application via the API directly (using `request` fixture) and cleans up after.

**Tests:**
1. **List view shows applications** — navigate to `/`, assert application name appears in the list
2. **Expand application** — click app name, assert configuration section appears (empty state with add icon)
3. **Add application** — click add icon, fill name, save; assert new app appears in list
4. **Edit application** — click edit icon, change name, save; assert updated name in list
5. **Delete application** — click edit icon, click delete, confirm; assert app no longer in list
6. **Duplicate name shows error** — create app with existing name; assert conflict error message shown

### `tests/integration/configurations.spec.ts`

**Setup:** Each test creates an application and optionally a configuration via the API.

**Tests:**
1. **Expand shows configurations** — expand app, assert `name: config` pairs visible
2. **Add configuration** — expand app, click add-config, fill name and JSON config, save; assert config appears
3. **Edit configuration** — click edit icon on config, change name, save; assert updated name
4. **Delete configuration** — edit config, delete, confirm; assert config gone from list
5. **Invalid JSON shows error** — enter non-JSON in config field, submit; assert inline error
6. **Duplicate config name shows error** — create config with existing name for same app; assert conflict error

---

## Part 10: Implementation Order

1. **Backend**: Add `list_all`, `delete` to application repository + router; add `list_by_application`, `delete` to configuration repository + router; add backend tests
2. **Project scaffold**: Create `ui/` directory, `package.json`, `tsconfig.json`, `vite.config.ts`, `playwright.config.ts`, `index.html`
3. **Types & API client**: `models.ts`, `client.ts`, `applications.ts`, `configurations.ts`
4. **Components**: `confirm-dialog.ts` → `app-list.ts` → `app-form.ts` → `config-form.ts` → `app-root.ts` → `main.ts`
5. **Styles**: `global.css` and per-component Shadow DOM styles
6. **Unit tests**: Write vitest tests for API client and each component
7. **Integration tests**: Write Playwright tests for application and configuration flows
8. **Verify**: `pnpm run test` passes; `pnpm run dev` shows working UI against live API

---

## API Reference Summary

| Method | Path | Payload | Response |
|--------|------|---------|----------|
| GET | `/api/v1/applications` | — | `Application[]` |
| POST | `/api/v1/applications` | `{ name, comments? }` | `Application` |
| GET | `/api/v1/applications/{id}` | — | `Application` |
| PUT | `/api/v1/applications/{id}` | `{ name?, comments? }` | `Application` |
| DELETE | `/api/v1/applications/{id}` | — | 204 |
| GET | `/api/v1/configurations?application_id={id}` | — | `Configuration[]` |
| POST | `/api/v1/configurations` | `{ application_id, name, comments?, config? }` | `Configuration` |
| GET | `/api/v1/configurations/{id}` | — | `Configuration` |
| PUT | `/api/v1/configurations/{id}` | `{ name?, comments?, config? }` | `Configuration` |
| DELETE | `/api/v1/configurations/{id}` | — | 204 |

> **Note:** The GET list and DELETE endpoints do not yet exist in the config-service and must be implemented as part of this plan (Part 1).
