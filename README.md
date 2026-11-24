# Notiz

Personal, local-first replacement for Notion. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## New computer (one click)

Download [`setup-notiz.cmd`](setup-notiz.cmd) (or use it from an existing checkout) and double-click it. It:

1. installs Git and Node.js LTS with `winget` if they are missing (Windows may ask for permission),
2. installs the pnpm version pinned in `package.json` through corepack into `%USERPROFILE%.localin` and adds that folder to your PATH,
3. clones this repo into `%USERPROFILE%source
epos
otiz` (GitHub may ask you to sign in) or pulls the newest code when it is already there and has no local changes,
4. runs `pnpm install --frozen-lockfile` (the exact versions from `pnpm-lock.yaml`), creates `.env` from `.env.example` if there is none, and runs `pnpm db:migrate`.

Running it again is safe: it never overwrites `.env` or `data/`. Your notes are not copied between computers; each one starts with an empty database. Another folder: `setup-notiz.cmd -RepoDir D:
otiz`. The work is done by `scripts/setup.ps1`.

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

| Command           | What it does                                                         |
| ----------------- | -------------------------------------------------------------------- |
| `pnpm dev`        | Start server (port 3001) and web (http://localhost:5173)             |
| `pnpm serve`      | Build the web app and serve it on port 5173 (lighter, for the phone) |
| `pnpm check`      | Lint + typecheck + tests                                             |
| `pnpm test`       | Tests only                                                           |
| `pnpm db:migrate` | Apply migrations to `DATA_DIR/notiz.db`                              |
| `pnpm format`     | Format all files with Prettier                                       |

## Open Notiz on your phone (Tailscale)

Notiz has no login, so it only listens on this computer by default. To use it from your phone, put both devices in a private [Tailscale](https://tailscale.com) network and let the web dev server listen on this computer's Tailscale address:

1. Install Tailscale on this computer and the phone and sign in to the same account.
2. Find this computer's Tailscale IP (`tailscale ip -4`, it starts with `100.`).
3. Add `WEB_HOST=<that IP>` to the repo `.env` (not `.env.example`).
4. Allow port 5173 on the Tailscale network in an administrator PowerShell:
   `New-NetFirewallRule -DisplayName "Notiz dev (Tailscale)" -Direction Inbound -Protocol TCP -LocalPort 5173 -InterfaceAlias Tailscale -Action Allow`
5. Start `pnpm serve` (or `pnpm dev`; only one at a time, both use port 5173).
6. On the phone open `http://<that IP>:5173`.

`pnpm serve` builds the web app first and serves a few minified, gzipped files (about 150 kB for the start page, more for the editor and diagrams). `pnpm dev` sends hundreds of unbundled modules, which is very slow over Tailscale's relay connection (`tailscale status` shows `relay` when there is no direct path). Use `pnpm serve` on the phone and restart it after code changes. With `WEB_HOST` set, the web app answers only on that address, also on this computer (not on `localhost`).

The API server stays on `127.0.0.1`; the phone reaches it through the web server's `/api` proxy. Never set `WEB_HOST` to `0.0.0.0` on a network you do not trust: everyone who can reach the port can read and change all data.
