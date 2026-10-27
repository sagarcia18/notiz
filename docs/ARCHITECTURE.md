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
| Diagrams | bpmn-js (Phase 5)                                                      | The bpmn.io BPMN 2.0 modeler; its bpmn.io logo must stay visible.   |
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
| `kind`                                   | `doc` \| `database` \| `dashboard` \| `bpmn`                      |
| `title`, `icon`                          |                                                                   |
| `sort_order`                             | Fractional index key (text); reorder without renumbering siblings |
| `content_json`                           | BlockNote document                                                |
| `properties_json`                        | Values when the page is a database row, keyed by property id      |
| `diagram_xml`                            | BPMN 2.0 XML of a `bpmn` page (Phase 5), null for other kinds     |
| `is_template`                            | Boolean                                                           |
| `created_at`, `updated_at`, `deleted_at` | `deleted_at` set = in trash (soft delete)                         |

Trash: deleting a page soft-deletes its whole active subtree with one shared `deleted_at` timestamp. The trash lists only "trash roots" (trashed pages whose parent is not trashed at the same moment). Restoring a page restores the descendants that carry the same `deleted_at`; subpages trashed earlier stay in the trash. If the parent is still trashed, the restored page moves to the top level. Invariant: a trashed page never has active descendants. Nothing is hard-deleted except via the explicit "delete forever" / "empty trash" actions, which also remove the `pages_fts` rows.

Sort keys: `sort_order` is a base-62 fractional key (`sortKeyBetween` in `packages/shared/src/sortKey.ts`), compared bytewise. Moving or creating a page computes a key between its new neighbours; siblings are never renumbered.

### pages_fts (Phase 0)

Standalone FTS5 table (`page_id` unindexed, `title`, `body`), tokenizer `unicode61 remove_diacritics 2` so "deteccion" finds "Detección". Kept in sync by the page service, because `body` is plain text extracted from BlockNote JSON in TypeScript.

### attachments (Phase 2)

| Column         | Notes                                                                        |
| -------------- | ---------------------------------------------------------------------------- |
| `id`           | PK                                                                           |
| `page_id`      | FK -> pages.id                                                               |
| `file_name`    | Original name as uploaded (shown to the user)                                |
| `stored_path`  | Relative to `DATA_DIR`: `attachments/<pageId>/<attachmentId>-<safeFileName>` |
| `mime`, `size` | Content type from the upload, size in bytes                                  |
| `created_at`   |                                                                              |

Files are written to disk first and the row is inserted afterwards; a failed or oversized upload (limit 50 MB) leaves nothing behind. Moving a page to the trash keeps its files; "delete forever" / "empty trash" delete the rows in the same transaction as the pages and then remove the `attachments/<pageId>` folders. Files whose block was removed from the document stay on disk (no orphan cleanup yet). Downloads are served with `nosniff`, a sandboxing CSP, and `inline` disposition only for images, audio, video and PDF.

### Page content (Phase 2)

`content_json` stores the BlockNote document (array of blocks) exactly as the editor produces it. The server validates only the outline (every block has a `type`; `children` are blocks) and keeps all other fields. Every content save also rewrites `pages_fts.body` with `extractPlainText` (`packages/shared/src/content.ts`): one line per block, inline text, link text, table cells, file names and captions. The web app saves the whole document, debounced (800 ms) and serialized, and flushes pending changes when the page is left.

### db_properties (Phase 3)

| Column         | Notes                                                                                                  |
| -------------- | ------------------------------------------------------------------------------------------------------ |
| `id`           | PK                                                                                                     |
| `database_id`  | FK -> pages.id (a page of kind `database`)                                                             |
| `name`         |                                                                                                        |
| `type`         | `title` \| `text` \| `number` \| `select` \| `status` \| `date` \| `checkbox` \| `url`                 |
| `options_json` | Choices `{ id, name, color, group? }`; `group` (`todo` \| `in_progress` \| `complete`) only for status |
| `sort_order`   | Fractional key; creation order of the properties                                                       |

### db_views (Phase 3)

| Column        | Notes                                                                                     |
| ------------- | ----------------------------------------------------------------------------------------- |
| `id`          | PK                                                                                        |
| `database_id` | FK -> pages.id                                                                            |
| `type`        | `table` \| `board`                                                                        |
| `name`        |                                                                                           |
| `config_json` | `viewConfigSchema`: `filters`, `sorts`, `columns`, `groupByPropertyId`, `cardPropertyIds` |
| `sort_order`  | Fractional key; tab order                                                                 |

### Databases (Phase 3)

- A new database page gets one `title` property ("Name") and one table view ("Table"). Each database has exactly one title property; it cannot be retyped or deleted, and its value is the row page's `title` (so search and the page header keep working).
- **Rows** are pages (kind `doc`) whose parent is the database page. Their other values live in `properties_json`, keyed by property id: strings for text/url, numbers, booleans, option ids for select/status, `YYYY-MM-DD` for dates. Values are validated against the property type on every write (`isValidPropertyValue`); `PATCH /api/pages/:id { properties }` merges, `null` removes a value. `PageDetail` carries `databaseId` and `properties` for rows.
- Rows are hidden from the sidebar tree. Pages cannot be created in or moved into a database except through `POST /api/databases/:id/rows`; reordering rows inside their database uses the normal move endpoint.
- **Schema changes rewrite data in the same transaction** (rows in the trash included): deleting a property removes its values and its references in view configs; changing the type converts values with `convertPropertyValue` (options become their names and back, numbers/dates are parsed from text, anything else is cleared) and drops filters/grouping on it; removing an option clears the values that used it.
- **Querying:** `GET /api/views/:id/rows` loads the active rows and applies the view's filters (all must match; filters on missing properties or with operators unfit for the type are skipped) and sorts in TypeScript (`services/rowQuery.ts`). Empty values sort last; ties and views without sorts keep the manual `sort_order`. Board grouping is done in the web app from these rows.
- Deleting a database forever also deletes its `db_properties` and `db_views` rows.

### dashboard_widgets (Phase 4)

| Column         | Notes                                                                                                                                                            |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`           | PK                                                                                                                                                               |
| `dashboard_id` | FK -> pages.id (a page of kind `dashboard`)                                                                                                                      |
| `config_json`  | `widgetConfigSchema`: `type` (`kpi` \| `bar` \| `pie`), `title`, `databaseId`, `viewId`, `metric`, `metricPropertyId`, `groupByPropertyId`, `groupByStatusGroup` |
| `layout_json`  | `{ x, y, w, h }` in grid units; 12 columns, `x + w <= 12`                                                                                                        |
| `created_at`   | Widget order in the list (the grid places them by layout)                                                                                                        |

### Dashboards (Phase 4)

- A dashboard is a page of kind `dashboard` with widgets instead of content. Like databases, it cannot have subpages (create and move answer 409).
- **One aggregation service** (`services/aggregation.service.ts`) computes every number: it loads the active rows of `databaseId`, narrows them with the filters of `viewId` (reusing `rowQuery.filterRows`; the view's sorts are irrelevant), then the pure `aggregateRows` applies the metric (`count`, or `sum`/`avg` of a number property; rows without a number are ignored, an average of nothing is `null`). Bar and pie widgets group by a select/status property in option order, or a status property by status group (To-do / In progress / Complete); every option gets a bucket (also with 0), rows without a value or with a removed option go to a trailing "No value" bucket.
- `GET /api/widgets/:id/data` answers `{ state, total, buckets }`. `unconfigured`: no database chosen yet (or a chart without grouping). `source_missing`: the database is trashed/deleted, the view belongs to another database or is gone, or a property is gone or has an unfitting type. Configs are not rewritten when sources change; the widget just reports `source_missing`.
- Saving a config checks that it does not resolve to `source_missing` (400 otherwise). New widgets without a layout go below the lowest widget in the left column.
- Deleting a dashboard forever also deletes its widgets.
- Web: the widget data query key starts with `['databases', databaseId]`, so every database mutation refreshes the widgets that read from it. `DashboardView` is lazy-loaded (Recharts + react-grid-layout); the grid uses `absoluteStrategy` (no CSS transforms) so the fixed-position settings popover is not displaced, and only changed positions are saved (`PUT /layout`).

### BPMN diagrams (Phase 5)

- A diagram is a page of kind `bpmn`. Its BPMN 2.0 XML lives in `pages.diagram_xml` (migration `0005_bpmn`), not in `content_json` (that stays the BlockNote document) and not as an attachment file: the XML is page content that is edited and searched, and keeping it in the row lets a save and its `pages_fts` update share one transaction (trash and purge need nothing extra).
- New `bpmn` pages start with `DEFAULT_BPMN_XML` (one start event). `PageDetail.diagram` is the XML for diagram pages and `null` otherwise.
- `PATCH /api/pages/:id { diagram }` replaces the whole diagram. It is accepted only for `bpmn` pages, must contain a `definitions` root element and is at most 5 MB (`diagramXmlSchema`); full XML validation is left to bpmn-js. Diagram pages reject `content` and, like dashboards, cannot have subpages (409).
- Every diagram save rewrites `pages_fts.body` with `extractBpmnText` (`packages/shared/src/bpmn.ts`): element `name` attributes (tasks, events, gateways, pools, lanes, flows), text annotations and documentation, entities decoded, one per line.
- Web: `features/bpmn` - lazy `BpmnView` (bpmn-js Modeler on a light canvas, also in dark mode). Every `commandStack.changed` serializes the diagram and schedules it in the shared `useSaveQueue` hook (same debounce and flush-on-leave as the block editor). Import replaces the diagram from a `.bpmn` file and saves it; export downloads `.bpmn` or `.svg`.

`multi_select` and other Notion types are decided in Phase 7. Notion "person" properties (e.g. Assignee) have no equivalent in a single-user app and are skipped on import.

## API overview

All endpoints live under `/api`. Request/response schemas come from `packages/shared`. Errors always use `{ error: { code, message } }` with codes `not_found` (404), `validation_failed` (400), `conflict` (409), `internal` (500).

| Method | Path                            | Phase | Purpose                                                                      |
| ------ | ------------------------------- | ----- | ---------------------------------------------------------------------------- |
| GET    | `/api/health`                   | 0     | Server + database liveness                                                   |
| GET    | `/api/pages/tree`               | 1     | Nested tree of active, non-template pages                                    |
| POST   | `/api/pages`                    | 1     | Create `{ parentId?, title?, kind? }` as last child (201)                    |
| GET    | `/api/pages/:id`                | 1     | Page detail                                                                  |
| PATCH  | `/api/pages/:id`                | 1-5   | Update `{ title?, icon?, content?, diagram? }`                               |
| POST   | `/api/pages/:id/move`           | 1     | Move `{ parentId, beforeId? \| afterId? }`; 409 on cycles or foreign anchors |
| DELETE | `/api/pages/:id`                | 1     | Move page + subtree to trash (204)                                           |
| GET    | `/api/trash`                    | 1     | Trash roots, newest first                                                    |
| POST   | `/api/trash/:id/restore`        | 1     | Restore page + subtree trashed with it                                       |
| DELETE | `/api/trash/:id`                | 1     | Delete page + subtree forever (204)                                          |
| DELETE | `/api/trash`                    | 1     | Empty trash (204)                                                            |
| POST   | `/api/pages/:id/attachments`    | 2     | Upload one file (multipart, field `file`, max 50 MB) (201)                   |
| GET    | `/api/attachments/:id`          | 2     | Download / display an attachment                                             |
| GET    | `/api/databases/:id`            | 3     | Properties and views of a database                                           |
| POST   | `/api/databases/:id/properties` | 3     | Add property `{ name, type, options? }` (201)                                |
| PATCH  | `/api/properties/:id`           | 3     | Rename, retype or change options (converts row values)                       |
| DELETE | `/api/properties/:id`           | 3     | Delete property and its values (204); not the title                          |
| POST   | `/api/databases/:id/views`      | 3     | Add view `{ type, name? }` (201)                                             |
| PATCH  | `/api/views/:id`                | 3     | Update `{ name?, config? }`                                                  |
| DELETE | `/api/views/:id`                | 3     | Delete view (204); 409 for the last one                                      |
| GET    | `/api/views/:id/rows`           | 3     | Rows filtered and sorted by the view                                         |
| POST   | `/api/databases/:id/rows`       | 3     | Create row `{ title?, properties? }` as last row (201)                       |
| GET    | `/api/dashboards/:id`           | 4     | Widgets of a dashboard                                                       |
| POST   | `/api/dashboards/:id/widgets`   | 4     | Add widget `{ config, layout? }` (201)                                       |
| PUT    | `/api/dashboards/:id/layout`    | 4     | Save positions `{ items: [{ id, layout }] }`; returns the dashboard          |
| PATCH  | `/api/widgets/:id`              | 4     | Update `{ config?, layout? }`                                                |
| DELETE | `/api/widgets/:id`              | 4     | Delete widget (204)                                                          |
| GET    | `/api/widgets/:id/data`         | 4     | Aggregated `{ state, total, buckets }`                                       |

`PATCH /api/pages/:id` also accepts `properties` for database rows (Phase 3). Later phases add search and templates.

## Decisions

- **Migrations:** drizzle-kit generates SQL from `src/db/schema.ts`; things Drizzle cannot express (FTS5) go into `drizzle-kit generate --custom` migrations. Migrations run on server start and via `pnpm db:migrate`.
- **Shared package as TS source:** `@notiz/shared` exports `.ts` directly; Vite and tsx compile it, so no build step.
- **Server runs with tsx** in dev; a production build is not needed for a local app.
- **Dev proxy:** Vite forwards `/api` to Fastify (127.0.0.1:3001), so the browser sees one origin and no CORS setup is needed.
- **SQLite pragmas:** WAL journal, foreign keys on.
