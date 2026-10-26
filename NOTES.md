# NOTES

## Status

Phase 0 (architecture & scaffolding) done on branch `phase-0-scaffolding`.
Phase 1 (page tree) done on branch `phase-1-page-tree` (branched from phase 0).
Phase 2 (block editor) done on branch `phase-2-block-editor` (branched from phase 1).
Phase 3 (databases) done on branch `phase-3-databases` (branched from phase 2).

## Phase 3 - what was built

- No new dependencies. Migration `0003_databases` (`db_properties`, `db_views`).
- Shared: property/option/view/filter/sort schemas (`databases.ts`, `views.ts`), value validation and type conversion (`propertyValues.ts`), `operatorsByType`; `PageDetail.databaseId` + `properties`, `PATCH { properties }`.
- Server: `databases.service` (properties; type changes convert values, deletes strip values and view settings), `views.service` (CRUD, last view protected, `listViewRows`), `rows.service`, pure `rowQuery` (filters/sorts), `rowValues` (validated merge), `databaseSetup` (default title property + table view, default status options). Rows hidden from the tree; pages cannot be created in / moved into databases; purge removes properties and views. Details in `docs/ARCHITECTURE.md`.
- Web: `features/databases` - `DatabaseView` (view tabs: add table/board, double-click rename, delete; toolbar: filter, sort, visible columns / board settings), `TableView` (inline cell editors per type, add/trash rows, property menu: rename, type, options with colors and status groups, move, hide, delete; column resize), `BoardView` (columns per option + "No value", native drag-and-drop changes value and manual order, add card per column, chosen card properties), `RowProperties` panel on row pages. Sidebar: "New database" button (▦); databases have no "add subpage".
- Tests: value validation/conversion, filter/sort engine, databases/properties/rows API (guards, conversions, cleanup, purge), views API, board drop planning, table column config.

## Phase 2 - what was built

- Dependencies (approved): `@blocknote/core|react|mantine` 0.56 with `@mantine/core|hooks` 9 (web), `@fastify/multipart` (server).
- Shared: `pageContentSchema` (loose BlockNote blocks), `extractPlainText` for search, attachment schema and 50 MB limit; `PageDetail.content`, `PATCH { content }`.
- Server: content save rewrites the `pages_fts` body in the same transaction; migration `0002_attachments`; upload `POST /api/pages/:id/attachments` and `GET /api/attachments/:id` (`AttachmentFiles` in `src/storage`); delete forever / empty trash also remove attachment rows and folders. Fastify 4xx errors (bad multipart, malformed JSON) now map to `validation_failed` with their status; JSON body limit raised to 10 MB.
- Web: `features/editor` - lazy-loaded `PageBody` (save status + editor), presentational `PageEditor` (BlockNote, uploads via `uploadFile`), `usePageContent` hook, `SaveQueue` (debounced, serialized autosave, flush on leave, no endless retry on errors).
- Tests: plain-text extraction, content API + FTS sync, attachments (upload, download headers, size limit, purge), file-name sanitising, save queue.

## Phase 1 - what was built

- Shared: page/tree/trash Zod schemas; `sortKeyBetween` base-62 fractional keys (no dependency).
- Server: `/api/pages` (tree, create, get, patch title/icon, move with cycle check) and `/api/trash` (list roots, restore, delete forever, empty). Title changes and purges keep `pages_fts` in sync. Trash rules are in `docs/ARCHITECTURE.md`.
- Web: sidebar page tree (expand/collapse, add subpage, trash) with native HTML5 drag-and-drop (top/bottom quarter of a row = reorder, middle = nest); page view with editable icon + title; trash view with restore, delete forever and empty trash (confirm dialogs).
- Tests: API tests for pages and trash, sort key and drop-target unit tests.

## Phase 0 - what was built

- pnpm monorepo: `apps/web`, `apps/server`, `packages/shared`, `packages/mcp` (empty until Phase 6).
- Server: Fastify app factory (`buildApp`), central error handler with typed `DomainError`s, JSON 404s, `GET /api/health` (route -> service -> repository).
- Database: better-sqlite3 + Drizzle; migrations `0000_pages` (pages table) and `0001_pages_fts` (FTS5, accent-insensitive). Migrations run on server start.
- Web: React + Vite shell with sidebar layout, React Router, TanStack Query, `apiClient.getJson` validating responses with shared Zod schemas, server status on the home page.
- Tooling: TypeScript 6 strict, type-aware ESLint (no `any`, no non-null assertions, no console), Prettier, Vitest projects (shared/server/web), Husky + lint-staged pre-commit.
- Docs: `docs/ARCHITECTURE.md`, `README.md`, `.env.example`.

## Decisions taken with the user (defaults)

CSS Modules; attachments at `DATA_DIR/attachments/<pageId>/<attachmentId>-<fileName>` with relative stored paths; UUID ids + fractional `sort_order`; Assignee skipped, `multi_select` decided in Phase 7; status groups in `options_json`; soft delete cascades to subtree.

## Open points

- TypeScript is pinned to `~6.0.3` because typescript-eslint does not support TS 7 yet.
- pnpm lives in `%USERPROFILE%\.local\bin` (corepack shim), not in Program Files.
- Phase 1 UI not yet tested in the browser by the user. Sidebar expand state is in memory only (lost on reload). Drag-and-drop has no keyboard alternative yet.
- Moving pages via DnD reloads the tree after the server answers (no optimistic update).
- Phase 2 UI not yet tested in the browser by the user (editing, autosave, image/file upload, dark mode look).
- Orphaned attachment files (block deleted from a page) stay on disk until the page is deleted forever; a cleanup job is open.
- Saving sends the whole document each time; fine for normal pages, revisit if very large pages feel slow.
- The lazy editor chunk is ~960 kB (Vite size warning); acceptable for a local app.
- Search UI is not built yet; `pages_fts.body` is filled from now on (pages created earlier get a body on their next edit).
- Phase 3 UI not yet tested in the browser by the user (table editing, property menu, filters/sorts, board drag-and-drop, row page panel, dark mode).
- Databases: the selected view tab is not remembered across reloads; no row peek/side panel (rows open as full pages); no date ranges/times, `multi_select`, number formats, formulas or relations (Phase 7). Property values are not part of full-text search.
- Board drop sends two requests (value, then position) without a transaction; table and board updates are not optimistic (they refetch after the server answers). Columns are reordered with Move ←/→ in the property menu, not by dragging.
- A row restored from the trash after its database was deleted moves to the top level as a normal page; its old `properties_json` stays but is no longer shown.

## Next step

Phase 4 - Dashboards: `dashboard_widgets`, generic server-side aggregation service (e.g. count rows by status group), Recharts widgets on a react-grid-layout grid.
