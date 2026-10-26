# CLAUDE.md - Notiz (local Notion replacement)

## Project

Personal, single-user, local-first Notion replacement: nested pages, block editor, flexible databases (table + board), dashboards, templates, search, MCP server for Claude. Runs on Windows. Data lives in DATA_DIR (SQLite file + attachments folder).

## Stack

TypeScript strict | pnpm workspaces | apps/web: React, Vite, BlockNote, TanStack Query, Recharts, react-grid-layout | apps/server: Fastify, better-sqlite3, Drizzle, Zod | packages/shared: types + Zod schemas | packages/mcp: MCP server | Vitest, Playwright, ESLint, Prettier.

## Commands

- pnpm dev start web + server
- pnpm check lint + typecheck + tests (must pass before every commit)
- pnpm test tests only
- pnpm db:migrate run migrations

## Architecture rules

- Server: routes -> services -> repositories. Only repositories touch SQL. Routes validate with Zod from packages/shared.
- Web: feature folders; data fetching in hooks; components stay presentational.
- Dashboard aggregation runs only on the server in one generic service.
- Attachments are files on disk, never blobs in SQLite.
- Database rows are pages; values live in properties_json keyed by property id.
- Read docs/ARCHITECTURE.md before changing the data model; update it when you do.

## Workflow

1. One phase (or one task) per session.
2. Post a short plan first and wait for approval before larger changes.
3. Implement -> write tests -> run pnpm check -> update NOTES.md -> commit on the phase branch.
4. Conventional Commits (feat:, fix:, refactor:, test:, docs:, chore:).

## Token-saving rules

- At session start read only CLAUDE.md and NOTES.md. Open other files only when the task needs them.
- Do not scan the whole repository; use targeted search (file names, symbols).
- Edit files in place; never rewrite a whole file to change a few lines.
- Do not repeat file contents or long diffs in replies; summarize in 1-3 sentences.
- Do not re-run passing tests without a reason; run the affected test file first, full pnpm check before commit.
- When stuck after two attempts, stop and ask instead of trying variations.
- The user tests in the browser and reports errors; do not open the browser unless asked.

## Code style

- No any, no non-null assertions without a comment, no commented-out code, no stray console.log.
- Functions small and named by intent; files under ~250 lines, split when larger.
- Explicit return types on exported functions.
- Errors: typed domain errors in services, one central HTTP error handler.
- English for code, comments and commit messages.

## Definition of done

- pnpm check passes.
- New behaviour has tests; every bug fix starts with a failing regression test.
- NOTES.md lists what was built, open points and the next step.

## Do not

- Do not add multi-user, auth, sharing, comments or real-time sync.
- Do not change the stack or add dependencies without asking.
- Do not delete user data or migrations; schema changes go through new migrations only.
