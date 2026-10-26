# Notiz architecture

Personal, single-user, local-first Notion replacement. Runs on Windows; all data lives in `DATA_DIR`.

## Stack

| Area     | Choice                                                                 | Why                                                                 |
| -------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Language | TypeScript 6 (strict)                                                  | One language end to end; shared API types.                          |
| Monorepo | pnpm workspaces                                                        | Fast, strict dependency isolation.                                  |
| Web      | React 19, Vite, React Router, TanStack Query, CSS Modules              | CSS Modules: no extra dependency, scoped styles next to components. |
| Editor   | BlockNote (Phase 2)                                                    | Notion-like block editing out of the box.                           |
| Charts   | Recharts, react-grid-layout (Phase 4)                                  | Declarative charts; draggable dashboard grid.                       |
| Server   | Fastify 5, better-sqlite3, Drizzle ORM + drizzle-kit migrations, Zod 4 | Synchronous SQLite is fast and simple for a single user.            |
| Search   | SQLite FTS5                                                            | Built into SQLite; no extra service.                                |
| Claude   | MCP server (`packages/mcp`, Phase 6) calling the REST API              | The API stays the only way to change data.                          |
| Quality  | Vitest, Playwright (Phase 8), ESLint (type-aware), Prettier, Husky     |                                                                     |

pnpm is installed per user via `corepack enable --install-directory %USERPROFILE%\.local\bin pnpm` (no admin rights needed).

## Folder structure

```
apps/
  server/
    drizzle/            SQL migrations (generated + custom), never edited after commit
    src/
      config.ts         env -> AppConfig (DATA_DIR, PORT)
      app.ts            buildApp(): Fastify instance, error handler, routes
      index.ts          process entry: migrate, listen
      errors.ts         DomainError subclasses + central HTTP error handler
      db/               schema.ts (Drizzle), client.ts, migrate.ts
      routes/           HTTP only: Zod validation + mapping
      services/         business logic, throws DomainError
      repositories/     the only code that touches SQL
    test/               Vitest API + migration tests (in-memory SQLite)
  web/
    src/
      app/              App shell, router, layout, global CSS
      features/<name>/  hooks (data fetching) + presentational components
      lib/              apiClient (fetch + schema validation)
packages/
  shared/               Zod schemas + types: the API contract
  mcp/                  MCP server (Phase 6)
docs/ARCHITECTURE.md
```

## Data model

All IDs are UUID strings. Timestamps are ISO-8601 UTC text. JSON columns hold text.

### pages (Phase 0)

| Column                                   | Notes                                                             |
| ---------------------------------------- | ----------------------------------------------------------------- |
| `id`                                     | PK                                                                |
| `parent_id`                              | FK -> pages.id, null for root pages                               |
| `kind`                                   | `doc` \| `database` \| `dashboard`                                |
| `title`, `icon`                          |                                                                   |
| `sort_order`                             | Fractional index key (text); reorder without renumbering siblings |
| `content_json`                           | BlockNote document                                                |
| `properties_json`                        | Values when the page is a database row, keyed by property id      |
| `is_template`                            | Boolean                                                           |
| `created_at`, `updated_at`, `deleted_at` | `deleted_at` set = in trash (soft delete)                         |

Trash: deleting a page soft-deletes its whole subtree; restoring restores the subtree. Nothing is hard-deleted except via an explicit "empty trash" action by the user.

### pages_fts (Phase 0)

Standalone FTS5 table (`page_id` unindexed, `title`, `body`), tokenizer `unicode61 remove_diacritics 2` so "deteccion" finds "Detección". Kept in sync by the page service, because `body` is plain text extracted from BlockNote JSON in TypeScript.

### Planned tables

- `db_properties` (Phase 3): id, database_id, name, type (`title` | `text` | `number` | `select` | `status` | `date` | `checkbox` | `url`), options_json, sort_order. For `status`, options_json holds choices with colors **and** their group (`todo` | `in_progress` | `complete`) so dashboards can count open tasks by group. `multi_select` and other Notion types are decided in Phase 7.
- `db_views` (Phase 3): id, database_id, type (`table` | `board`), name, config_json (filters, sorts, group-by, visible columns).
- `dashboard_widgets` (Phase 4): id, dashboard_id, config_json, layout_json.
- `attachments` (Phase 2): id, page_id, file_name, stored_path, mime, size, created_at. Files live at `DATA_DIR/attachments/<pageId>/<attachmentId>-<fileName>`; `stored_path` is relative to `DATA_DIR` so the data folder can be moved.

Database rows are pages whose parent is the database page. Notion "person" properties (e.g. Assignee) have no equivalent in a single-user app and are skipped on import.

## API overview

All endpoints live under `/api`. Request/response schemas come from `packages/shared`. Errors always use `{ error: { code, message } }` with codes `not_found` (404), `validation_failed` (400), `conflict` (409), `internal` (500).

| Method | Path          | Phase | Purpose                    |
| ------ | ------------- | ----- | -------------------------- |
| GET    | `/api/health` | 0     | Server + database liveness |

Later phases add pages, attachments, databases/views, dashboards, search and templates.

## Decisions

- **Migrations:** drizzle-kit generates SQL from `src/db/schema.ts`; things Drizzle cannot express (FTS5) go into `drizzle-kit generate --custom` migrations. Migrations run on server start and via `pnpm db:migrate`.
- **Shared package as TS source:** `@notiz/shared` exports `.ts` directly; Vite and tsx compile it, so no build step.
- **Server runs with tsx** in dev; a production build is not needed for a local app.
- **Dev proxy:** Vite forwards `/api` to Fastify (127.0.0.1:3001), so the browser sees one origin and no CORS setup is needed.
- **SQLite pragmas:** WAL journal, foreign keys on.
