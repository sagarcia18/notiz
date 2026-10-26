# NOTES

## Status

Phase 0 (architecture & scaffolding) done on branch `phase-0-scaffolding`.

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

## Next step

Phase 1 - Page tree: CRUD, nesting, drag-and-drop reorder in the sidebar, trash with restore, API tests.
