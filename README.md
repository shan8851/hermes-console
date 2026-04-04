# Hermes Console

Local-first web UI for Hermes Agent.

Hermes Console is a visibility-first interface for understanding what your Hermes setup is doing without digging through terminal output, files, or half-remembered commands.

## Product shape

- Hermes-native
- local-first
- read-mostly at launch
- visibility and legibility over chat parity
- focused product, not a private ops dashboard

## Planned v1 surfaces

- Overview
- Sessions
- Cron jobs and recent runs
- Skills browser
- Memory browser
- Setup / inventory
- Key file explorer for Hermes state and context files

## Positioning

Hermes Console makes your Hermes setup legible: sessions, cron jobs, skills, memory, config, and key files in one calm place.

## Current status

Milestone 0 bootstrap is in progress.

What exists right now:
- Next.js app scaffold with App Router
- Tailwind, TypeScript, ESLint, and Vitest wiring
- app shell with sidebar + top bar
- placeholder routes for Overview, Sessions, Cron, Skills, Memory, Setup, and Files

Still to come before Milestone 0 feels done:
- bootstrap cleanup and README polish
- first real config/inventory plumbing
- a docs sync pass after the implementation settles

## Local setup

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Open `http://localhost:3000`.

## Environment

Hermes Console is designed to work against a normal Hermes install under `~/.hermes`.

Optional overrides:
- `HERMES_CONSOLE_HERMES_DIR` — alternate Hermes state root
- `HERMES_CONSOLE_WORKSPACE_DIR` — alternate workspace/context root for discovering high-signal project files

Copy `.env.example` to `.env.local` if you want to set either of them.

## Current discovery assumptions

The first inventory pass is intentionally boring and explicit.

Resolved roots:
- Hermes root defaults to `~/.hermes`
- workspace root defaults to your home directory
- either path can be overridden via env

Discovered agent roots:
- default/root agent: `<hermesRoot>`
- profile agents: `<hermesRoot>/profiles/*`

Current availability checks look for:
- `config.yaml`
- `memories/`
- `sessions/`
- `cron/`
- `skills/`
- `state.db`

Current installation states:
- `missing` — resolved Hermes root does not exist
- `partial` — Hermes root exists, but no discovered agent has meaningful runtime surfaces yet
- `ready` — at least one discovered agent looks usable

## Scripts

```bash
pnpm dev
pnpm test
pnpm lint
pnpm build
```

