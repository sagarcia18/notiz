# NOTES

## Status

Phase 0 (architecture & scaffolding) done on branch `phase-0-scaffolding`.
Phase 1 (page tree) done on branch `phase-1-page-tree` (branched from phase 0).
Phase 2 (block editor) done on branch `phase-2-block-editor` (branched from phase 1).
Phase 3 (databases) done on branch `phase-3-databases` (branched from phase 2).
Phase 4 (dashboards) done on branch `phase-4-dashboards` (branched from phase 3).
Phase 5 (BPMN diagrams) done on branch `phase-5-bpmn` (branched from phase 4).
Phase 6 (MCP server) done on branch `phase-6-mcp` (branched from phase 5).
Phase 7 (Notion import + search UI) done on branch `phase-7-notion-import` (branched from phase 6).
Phase 8 (responsive layout for phones and tablets) done on branch `phase-8-responsive` (branched from phase 7). Playwright E2E moved to Phase 9.

## Phase 8 - what was built

- No new dependencies, no migration; web only. Breakpoint convention in `lib/breakpoints.ts` (phone < 768px, tablet 768-1024px, touch = `pointer: coarse`) with `useMediaQuery` / `useBreakpoint` / `useCoarsePointer`; details in `docs/ARCHITECTURE.md` ("Responsive layout").
- Sidebar: off-canvas drawer below 1025px (☰ in a top bar on phones, a thin rail on tablets; overlay, Esc, closes on navigation, `inert` while closed). Smaller page padding and title on phones.
- Search palette and import dialog render in a portal (they are opened from the drawer); full-screen palette with a Cancel button and a bottom-sheet import dialog on phones.
- `Popover`: clamped to the window (pure `panelPosition`), bottom sheet on phones that survives the on-screen keyboard. Database toolbars and view tabs wrap/scroll; inputs use 16px on phones (no iOS zoom).
- Tables: sticky title column on tablets/phones, Open/trash always visible on touch. Boards: snapping columns of ~85vw on phones. Native drag-and-drop is off on touch screens for the page tree and board cards; tree add/trash buttons are always visible there; tap targets ~40-44px.
- Dashboards: one column on phones in saved grid order (`stackedWidgets`, `stackedHeight`) without react-grid-layout, so the desktop layout is never changed; tablets keep the grid.
- Editor without BlockNote's 54px gutter below 1025px; BPMN canvas sized with `dvh`, wrapping toolbar; trash list wraps on phones.
- Tests: `useMediaQuery.test.tsx` (breakpoints, live changes, coarse pointer), `AppLayout.test.tsx` (desktop sidebar, open/Esc/overlay, close on navigation, desktop -> tablet), `popoverPosition.test.ts`, `Popover.test.tsx` (desktop panel vs phone sheet), `SearchPalette` Cancel, `layout.test.ts` (stacked order and height), `DashboardView.test.tsx` (stack on phones without saving, grid on desktop).

## Phase 7 - what was built

- Decisions (approved): dependency `fflate` 0.8 (server) for unzipping; `multi_select` added; import in one step with type inference (no preview step). No migration.
- `multi_select`: values are option-id lists; validation, conversion (to/from select, status, text), filters contains/not contains/empty, sort by first option, `MultiChoiceCell` editor, board card pills, MCP names. Tests: `propertyValues.test.ts`, `rowQuery.test.ts`, `databases.test.ts`, `MultiChoiceCell.test.tsx`.
- Notion import: `POST /api/import/notion` for the "Markdown & CSV" zip (nested part zips too), pure parsers in `apps/server/src/import/`, `NotionImporter` writing through the existing services in one transaction under a new "Notion import <date time>" page; attachments on disk, removed again on failure. Type mapping and rules in `docs/ARCHITECTURE.md`. Web: "⇪ Import from Notion" in the sidebar footer -> `ImportDialog`. Tests: `notionParsing`, `notionMarkdown`, `notionInference`, `notionImport` (API end to end, rollback incl. files, invalid uploads), `ImportDialog.test.tsx`.
- Search UI: sidebar "🔍 Search Ctrl K" + global Ctrl+K/Cmd+K palette (`features/search`): debounced `useSearch`, highlighted titles/snippets, database name for rows, ↑/↓/Enter/Esc, mouse. Tests: `SearchPalette.test.tsx` (keyboard, mouse, states, highlight), `SearchCommand.test.tsx` (shortcut, fetch, navigation to a row).

## Phase 6 - what was built

- Dependency (approved): `@modelcontextprotocol/sdk` 1.32 in `packages/mcp` (plus `tsx`, already used by the server, to run it). No migration.
- Search API: `GET /api/search?q=&limit=` (`search.routes` -> `search.service` -> `search.repository`); shared `search.ts` with query/result schemas and `toFtsQuery` (every word quoted + prefix, so input is never FTS syntax). Skips trash and templates, includes database rows (`databaseId`), returns a snippet.
- MCP server (`packages/mcp`): stdio entry `src/index.ts`, `createNotizMcpServer`, `NotizApi` (fetch + shared schemas, typed `NotizApiError` incl. `unreachable`), 14 tools for pages, search, databases/rows/properties and diagram links/usages. `get_page` adds plain `text`; `create_page`/`update_page` take `text` (Markdown-like lines -> BlockNote blocks via `textToBlocks`) or raw `content`. Setup for Claude Code / Desktop in `packages/mcp/README.md`; details in `docs/ARCHITECTURE.md`.
- Database queries: `POST /api/databases/:id/query` and `/aggregate` (`databaseQuery.service`, reusing the view filter/sort engine and the dashboard aggregation; strict validation instead of silently skipped filters). MCP tools `query_database` and `aggregate_database` take property/option names (`queryNames.ts`) and return rows keyed by property name. Tests: `databaseQuery.test.ts` (filters, sorts, paging, status group, checkbox, validation, 404, count/sum/avg, grouping) and `query.tools.test.ts` (names, paging/columns, error messages, aggregation).
- MCP access switch (approved): migration `0008_settings` (key/value `settings` table), `GET/PATCH /api/settings`, error code `mcp_disabled` (403). The MCP client sends `X-Notiz-Client: mcp`; an `onRequest` hook refuses those requests while the switch is off and records the last use (in memory). Sidebar footer switch "Claude (MCP): On/Off" with a dot and "Last used … ago" (bottom-left, sticky). Tests: `settings.test.ts` (default, last use, refusal for MCP only, persists across restart, empty update), MCP `mcp_disabled` message, `McpSwitch.test.tsx` (formatter, on/off, saving, errors).
- Tests: search API (prefix/accents, AND, FTS syntax as text, rows + trash, limit, validation); MCP tools end-to-end through a real MCP client over `InMemoryTransport` with `fetch` routed into `buildApp().inject` (tool list, pages, tree/move/trash, error mapping, search, databases/rows/properties, diagram links/usages); `NotizApi` with a stubbed fetch, `textToBlocks`, config. New Vitest project `mcp`.

## Phase 5 - what was built

- Dependency (approved): `bpmn-js` 18 (web, ships its own types). Migration `0005_bpmn` (`pages.diagram_xml`).
- Shared: page kind `bpmn`, `PageDetail.diagram`, `PATCH { diagram }`; `bpmn.ts` with `diagramXmlSchema` (definitions root, 5 MB), `DEFAULT_BPMN_XML`, `extractBpmnText` for search.
- Server: new diagram pages get the default diagram; saves rewrite the `pages_fts` body in the same transaction; diagram only on `bpmn` pages, no block content on them, no subpages (409). Details in `docs/ARCHITECTURE.md`.
- Web: `features/bpmn` - lazy `BpmnView` (toolbar: save status, Export .bpmn, Export .svg, Import .bpmn), `useBpmnModeler` (mounts the Modeler, change -> XML), `useDiagramSave`. Autosave logic moved into the shared `editor/useSaveQueue` hook, used by both the block editor and diagrams. Sidebar: "New diagram" button (⇄); diagrams show 🔀 and have no "add subpage".
- Task links (second step): tasks link to pages or database rows via `notiz:pageId` in the XML; `GET /api/pages/:id/diagram-links` (`diagramLinks.service`) resolves them with the first status property of the row's database; `LinkPicker` (pages / database rows, remove) and `LinkBadge` overlays (status pill or title, ↗ opens the page, "Linked page missing"). Tests: link extraction, links API (status, no status, missing/trashed/purged/invalid, kind guard), `LinkPicker`, `BpmnView` badges and linking, `linkTargets`.
- Backlinks (third step): migration `0006_diagram_links`, a table rebuilt from the XML on each diagram save and on server start; `GET /api/pages/:id/diagram-usages`; "Used in diagrams" links under the page header (`DiagramUsages`). Tests: usages API (dedupe/order, removed link, trash/restore/purge, rebuild), `PageView` backlinks.
- Data stores (fourth step): `bpmn:DataStoreReference` elements link to a database ("Link database…", databases-only picker); the badge shows icon, title and active row count, hover shows the database description. Databases got a `description` (migration `0007_database_description`, text box under the title, part of search). Tests: description API (save, search, kind guard, limit), links API row count/description, `linkTargetKindOf`/`selectedTaskOf`, `LinkPicker` databases-only, `LinkBadge`, `PageView` description editing.
- Tests: text extraction and schema, diagram API (default, save + FTS, guards, size, subpages, purge), `BpmnView` (jsdom with a fake Modeler: no save on open, autosave after edit, import, broken file), `PageView` routing to the diagram view, file names.

## Phase 4 - what was built

- Dependencies (approved): `recharts` 3, `react-grid-layout` 2 (ships its own types) in web. Migration `0004_dashboards` (`dashboard_widgets`).
- Shared: `dashboards.ts` - widget config/layout/data schemas, create/update/layout inputs, `GRID_COLUMNS`, `NO_VALUE_KEY`.
- Server: `aggregation.service` (the one place numbers are computed: count/sum/avg, grouping by option or status group, view filters via `rowQuery`, `unconfigured`/`source_missing` states), `dashboards.service` + repository + routes (CRUD, bulk layout, data). Dashboards cannot have subpages; purge removes widgets. Details in `docs/ARCHITECTURE.md`.
- Web: `features/dashboards` - lazy `DashboardView` (react-grid-layout, drag by the widget header, resize, saves only changed positions), `WidgetCard` (title, ⚙ settings popover, delete), `WidgetBody` (KPI number, bar/pie via `WidgetCharts`, state messages), `WidgetSettingsForm` (type, title, database, view filters, metric, number property, group by, status groups) with pure transitions in `widgetSettings.ts`. Sidebar: "New dashboard" button (◔); dashboards show 📊 and have no "add subpage".
- Tests: pure aggregation, dashboards API (layout placement, guards, view filters, validation, source_missing after deletes, bulk layout, purge, no subpages), layout diff, settings transitions, `WidgetBody` (jsdom).

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

- Phone access (user request): opt-in `WEB_HOST` in the repo `.env` makes the Vite dev server listen on that address (meant for the Tailscale IP); the API stays on 127.0.0.1 behind the `/api` proxy. Vite now reads the repo `.env` (`loadEnv`), so `API_PORT` from `.env` reaches the proxy too. No login: anyone who can reach the port has full access. The layout is responsive since Phase 8. Setup steps in `README.md`; test: `apps/web/devServer.test.ts`.
- TypeScript is pinned to `~6.0.3` because typescript-eslint does not support TS 7 yet.
- pnpm lives in `%USERPROFILE%\.local\bin` (corepack shim), not in Program Files.
- Phase 1 UI not yet tested in the browser by the user. Sidebar expand state is in memory only (lost on reload). Drag-and-drop has no keyboard alternative yet.
- Moving pages via DnD reloads the tree after the server answers (no optimistic update).
- Phase 2 UI not yet tested in the browser by the user (editing, autosave, image/file upload, dark mode look).
- Orphaned attachment files (block deleted from a page) stay on disk until the page is deleted forever; a cleanup job is open.
- Saving sends the whole document each time; fine for normal pages, revisit if very large pages feel slow.
- The lazy editor chunk is ~960 kB (Vite size warning); acceptable for a local app.
- Search UI is not built yet; `pages_fts.body` is filled from now on (pages created earlier get a body on their next edit).
- Phase 3 browser feedback fixed: leftover page headers after "Open" (duplicate React keys in `PageView`; the article is now keyed by page id), Enter saves property/option names, property and toolbar popovers are fixed-positioned so the table no longer clips them. Regression test: `PageView.test.tsx` (switches database ↔ row three times; fails on the old code from the second round).
- Component tests (approved dev deps `jsdom`, `@testing-library/react`, its peer `@testing-library/dom`): opt in per file with `// @vitest-environment jsdom`, stub `fetch`, call `cleanup()` in `afterEach`, and `vi.mock` the lazy BlockNote `PageBody`. Other web tests keep the fast node environment.
- Phase 3 UI otherwise not yet fully tested in the browser by the user (table editing, property menu, filters/sorts, board drag-and-drop, row page panel, dark mode).
- Databases: the selected view tab is not remembered across reloads; no row peek/side panel (rows open as full pages); no date ranges/times, `multi_select`, number formats, formulas or relations (Phase 7). Property values are not part of full-text search.
- Board drop sends two requests (value, then position) without a transaction; table and board updates are not optimistic (they refetch after the server answers). Columns are reordered with Move ←/→ in the property menu, not by dragging.
- Relations (user request, "To change in Notiz"): property type `relation` with a target database (migration `0009_property_config`, `config_json`); values are row ids checked against the target; filters contains / does not contain / is empty / is not empty; `RelationCell` picker with search. Open: no reverse relation or rollups, no sorting/grouping by relation, the picker lists the first 500 rows, MCP shows row ids instead of titles. Tests: `relations.test.ts`, shared relation values, `RelationCell`, `PropertyMenu`, `relationValues`.
- Fixed (user feedback): a view could only be deleted from the "+" add-view menu, which users did not find. The active tab now has a × ("Delete view <name>", with confirmation; not shown for the last view). Regression test: `ViewTabs.test.tsx`.
- A row restored from the trash after its database was deleted moves to the top level as a normal page; its old `properties_json` stays but is no longer shown.

- Phase 4 UI not yet tested in the browser by the user (adding widgets, settings popover inside a grid item, drag/resize and saving, charts in dark mode, refresh after editing rows).
- Dashboards: no line/time-series charts (grouping by date), no per-widget filters (only a view's filters), one database per widget, no grouping by checkbox. Widget configs are not cleaned when a property or view is deleted; the widget shows "source missing" and must be reconfigured.
- Chart fills reuse the option colors of the pills (not a validated categorical palette; several pairs fail the CVD check). Bars are named on the axis and pie slices in the legend and tooltip, so identity never depends on color alone.
- The grid has fixed 12 columns on tablets and desktops (narrow desktop windows above 767px still squeeze widgets); phones get a stacked column (Phase 8). Layout saves are not debounced: each finished drag/resize sends one `PUT` with the changed widgets.

- Fixed a flaky dashboards test: widgets created in the same millisecond were listed by their random id; ties now follow insertion order (`rowid`). Regression test in `dashboards.test.ts`.
- Phase 5 UI not yet tested in the browser by the user (modeling, autosave, import/export, the light canvas inside the dark theme, keyboard shortcuts of bpmn-js).
- Task links: badges refresh after a diagram save, on focus or when the diagram is reopened, not live while a row is edited elsewhere. "Used in diagrams" refreshes after a diagram save or on focus. Tasks, data stores (databases) and data objects (database rows, "Link row…") can be linked; events, gateways and subprocesses cannot. A badge shows a changed database description or row count once the diagram is reopened or the window regains focus. The picker shows rows of the database's first view (its filters apply). Badge colors are fixed light colors on the light canvas.
- Diagrams: no properties panel (names are edited on the canvas by double-click), no embedding of a diagram inside a doc page, one diagram per page. The lazy `BpmnView` chunk is ~580 kB JS + ~120 kB CSS. The server only checks the `definitions` root; a structurally broken diagram is reported when bpmn-js opens it.

- Fixed: the API server read `PORT`, which the Claude desktop preview sets for Vite (5173), so the API bound 127.0.0.1:5173 next to Vite on ::1:5173 and nothing listened on 3001. Server, Vite proxy and MCP now use `API_PORT` (default 3001); `PORT` is ignored. Regression test: `apps/server/test/config.test.ts`. An existing `.env` with `PORT=` must be renamed to `API_PORT=`.
- Phase 6 MCP server not yet tried by the user from Claude Desktop / Claude Code (stdio start and the initialize handshake were smoke-tested locally). It needs the Notiz server running; it does not start it.
- MCP: `text` input keeps inline formatting (bold, links) as plain text and replaces the whole document (no append/patch of single blocks). No tools yet for attachments, dashboards/widgets, views (create/edit filters), property edits/deletes, trash restore/purge, or reordering with before/after.
- MCP switch: not yet tried by the user in the browser. "Last used" is reset when the API server restarts and refreshes every 30 s. The switch is a convenience, not a security boundary (a local program can skip the header). The in-app Claude assistant (chat panel via the Anthropic API) was planned and put on hold by the user to avoid API costs.
- Database queries: filters are ANDed only (no OR/nesting), one database per query (no joins or relations), no grouping by date or checkbox; date filters compare `YYYY-MM-DD` strings.
- Search: row property values are not searchable; pages created before Phase 2 get a body only on their next edit. The palette has no "recent pages" list for an empty query and no search inside the current page.

- Phase 7 not yet tested in the browser by the user (import with a real Notion export, multi-select editing, Ctrl+K inside the BlockNote editor, dark mode of the dialogs). Tested only with synthetic exports built in tests.
- Import limits: the whole zip is held in memory (500 MB upload, 1 GB unpacked) and processed synchronously, so a very large export blocks the server while it runs; no progress bar beyond "Importing…". Notion's HTML export, page icons/covers, comments, inline databases' view settings (filters, sorts, board grouping), toggle headings, equations, synced blocks and column layouts are not imported as such (they come in as plain blocks or text). Type inference can guess wrong (e.g. a text column with repeated values becomes select); the type can be changed afterwards. Row pages are matched to CSV rows by title, so two rows with the same title may swap bodies. Subpages of rows are hidden from the sidebar. Notion's percent-encoded links with unusual characters may stay plain text. A failed import can leave empty `attachments/<pageId>` folders (files are removed).
- Internal page links in imported content are `/pages/<id>` hrefs; how the editor opens them (same or new tab) is not checked yet.
- `multi_select`: no grouping on boards or dashboards; option order is the stored order, values are sorted in option order when edited.

- Phase 8 not yet tested by the user on a real phone or tablet; only jsdom tests and CSS review (no browser run in this phase).
- Not responsive / touch limits: no way to move pages in the tree or cards between board columns on touch screens (change the value on the row page instead; a "Move to…" menu is open); dashboards cannot be arranged on phones (only on tablet/desktop); table column resizing by touch depends on pointer events and is fiddly; BlockNote's side menu (drag handle, "+") and formatting toolbar are mouse-first, editing text works; the BPMN canvas is view-and-export on phones (diagram-js has no touch panning/modeling, so drags scroll the page); the light BPMN canvas and charts are not re-laid out for very small heights; no landscape-specific tweaks; the drawer has no swipe-to-open gesture and no focus trap (it is `inert` while closed).
- The sidebar expand state and drawer state are in memory only.

## Next step

Phase 9: Playwright E2E (include phone and tablet viewports, e.g. 375px with no horizontal page scroll). Still open from the project scope: templates.
