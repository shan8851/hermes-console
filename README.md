# Hermes Console

A local-first dashboard for inspecting a real Hermes Agent setup without living in the terminal.

Hermes Console is now a small monorepo:

- `packages/runtime` holds pure types, schemas, and domain helpers
- `apps/api` owns filesystem reads, Hermes CLI diagnostics, and the local HTTP boundary
- `apps/web` is a Vite React app with TanStack Router and React Query

The product stays read-mostly and Hermes-native. The API runs on `127.0.0.1`, reads Hermes state directly from disk per request, and serves the built web app on the same origin in production.

## Screenshots

### Overview

![Hermes Console overview placeholder](./apps/web/public/readme/overview-placeholder.png)

### Sessions

![Hermes Console sessions placeholder](./apps/web/public/readme/sessions-placeholder.png)

## What you get

- **Overview** for runtime health, gateway state, connected platforms, warnings, and drift
- **Sessions** for browsing recent Hermes runs across agents
- **Cron** for job status, recent outputs, and detail drill-in
- **Skills** for installed skills, summaries, linked files, and detail views
- **Memory** for `MEMORY.md` and `USER.md` visibility with pressure indicators
- **Files** for high-signal config and context file previews
- **Usage** for token and estimated cost summaries from local session data

## Architecture

### `packages/runtime`

Pure TypeScript only:

- zod schemas
- shared API envelope types
- inventory and overview domain types
- pure normalizers and composition helpers

No filesystem access, no HTTP server code, no React.

### `apps/api`

Local Node service built with Hono:

- resolves Hermes paths and env overrides
- reads Hermes files and CLI diagnostics
- exposes `/api/*` endpoints
- serves `apps/web/dist` in production

### `apps/web`

Vite React app:

- TanStack Router route tree
- TanStack Query for cached server state and refresh flows
- route-level pending/error handling
- focused page components for overview, sessions, cron, skills, memory, files, and usage

## Quick start

```bash
git clone https://github.com/giles-io/hermes-console.git
cd hermes-console
pnpm install
cp .env.example .env.local
pnpm dev
```

Then open [http://127.0.0.1:5173](http://127.0.0.1:5173) in development.

For a production-style local run:

```bash
pnpm build
pnpm start
```

Then open [http://127.0.0.1:3940](http://127.0.0.1:3940).

## Configuration

Copy `.env.example` to `.env.local` and adjust as needed.

| Variable | Default | Description |
|----------|---------|-------------|
| `HERMES_CONSOLE_HERMES_DIR` | `~/.hermes` | Hermes state root |
| `HERMES_CONSOLE_WORKSPACE_DIR` | unset | Optional workspace root for extra high-signal file discovery |
| `PORT` | `3940` | Local API port |

## Development

```bash
pnpm dev
pnpm build
pnpm start
pnpm test
pnpm typecheck
pnpm lint
```

`pnpm dev` starts:

- a runtime package watcher
- the local API on `127.0.0.1:3940`
- the Vite app on `127.0.0.1:5173`

## Product stance

- **Read-mostly**: visibility first, mutation later
- **Local-first**: everything runs against local Hermes state
- **Calm operator UX**: dense signal without dashboard theatre
- **Hermes-native**: built around Hermes files, sessions, cron, and memory rather than generic agent abstractions

## License

MIT
