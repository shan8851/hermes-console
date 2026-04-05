# Hermes Console

A local-first visibility dashboard for [Hermes Agent](https://hermes-agent.nousresearch.com/).

Hermes is powerful, but as your setup grows — sessions, cron jobs, skills, memory files, multiple agents — it gets hard to see what's going on without digging through the terminal. Hermes Console turns all of that into a single calm interface you can open in your browser.

## What it shows

- **Overview** — system health, gateway status, connected platforms, warnings, runtime configuration
- **Sessions** — full session history with agent/source/platform filtering
- **Cron** — scheduled jobs, run state, recent outputs, failure tracking
- **Skills** — browsable skill library with categories, metadata, and linked files
- **Memory** — MEMORY.md and USER.md with usage pressure indicators
- **Files** — key Hermes configuration and context files with preview

## Quick start

```bash
git clone https://github.com/giles-io/hermes-console.git
cd hermes-console
pnpm install
cp .env.example .env.local
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). Hermes Console will read your local Hermes state from `~/.hermes` automatically.

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `HERMES_CONSOLE_HERMES_DIR` | `~/.hermes` | Hermes state root |
| `HERMES_CONSOLE_WORKSPACE_DIR` | `~` | Workspace root for context files |

Copy `.env.example` to `.env.local` to configure.

## Stack

Next.js, React, TypeScript, Tailwind CSS. No database — reads Hermes state directly from disk.

## Development

```bash
pnpm dev        # start dev server
pnpm build      # production build
pnpm test       # run tests
pnpm lint       # lint
```

## Design principles

- **Read-only first** — observe and understand, don't control
- **Local-first** — runs on localhost, reads local state, no SaaS dependency
- **Calm over clever** — information-dense but breathable, not dashboard theatre
- **Hermes-native** — built for real Hermes runtime surfaces, not abstract agent frameworks

## License

MIT
