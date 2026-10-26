# Notiz

Personal, local-first replacement for Notion. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Requirements

- Node.js 22 or newer
- pnpm (no admin rights needed):

  ```bash
  corepack enable --install-directory "%USERPROFILE%\.local\bin" pnpm
  ```

## Setup

```bash
pnpm install
copy .env.example .env
```

`DATA_DIR` in `.env` decides where the SQLite file and attachments are stored (default `./data`).

## Commands

| Command           | What it does                                             |
| ----------------- | -------------------------------------------------------- |
| `pnpm dev`        | Start server (port 3001) and web (http://localhost:5173) |
| `pnpm check`      | Lint + typecheck + tests                                 |
| `pnpm test`       | Tests only                                               |
| `pnpm db:migrate` | Apply migrations to `DATA_DIR/notiz.db`                  |
| `pnpm format`     | Format all files with Prettier                           |
