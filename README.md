<div align="center">

# Hermes Console

**A local-first dashboard for your Hermes Agent setup.**

Point it at `~/.hermes`. See what's running, what's scheduled, what's stored, and what needs attention.

[![Hermes Console tour](./apps/web/public/readme/hermes-console-tour.gif)](./apps/web/public/readme/hermes-console-tour.gif)

</div>

---

## What it is

A read-only web UI that inspects your local Hermes state directly from disk. No cloud, no auth, no external services — just your files and a browser.

**Surfaces:**
- **Overview** — runtime health, gateway state, connected platforms, warnings, update drift
- **Sessions** — recent Hermes runs across agents with filtering and search
- **Cron** — scheduled job status, recent outputs, health indicators
- **Skills** — installed skills, categories, linked files, detail views
- **Memory** — `MEMORY.md` / `USER.md` visibility with pressure indicators
- **Files** — high-signal config and instruction file previews
- **Usage** — token counts and estimated cost breakdowns

## What it isn't

- Not a chat client
- Not a terminal replacement
- Not a hosted SaaS
- Not a generic multi-agent platform

## Why use it

If you run Hermes locally and want to understand your setup without digging through files and CLI output — this does that. One screen, live data, calm UX, no theatre.

## Quick start

```bash
git clone https://github.com/shan8851/hermes-console.git
cd hermes-console
pnpm install
cp .env.example .env.local
pnpm dev
```

Open the URL Vite prints (default `http://localhost:5173`).

For a production build:

```bash
pnpm build && pnpm start
```

## Configuration

Copy `.env.example` to `.env.local` and adjust as needed.

| Variable                       | Default     | Description                          |
| ------------------------------ | ----------- | ------------------------------------ |
| `HERMES_CONSOLE_HERMES_DIR`    | `~/.hermes` | Hermes state root                    |
| `HERMES_CONSOLE_WORKSPACE_DIR` | unset       | Extra workspace root for file discovery |
| `HERMES_CONSOLE_HERMES_BIN`    | `hermes`    | Hermes CLI path override             |
| `PORT`                         | `3940`      | API port                             |

## Screenshots

<p align="center">
  <img src="./apps/web/public/readme/overview.png" width="45%" alt="Overview" />
  <img src="./apps/web/public/readme/sessions.png" width="45%" alt="Sessions" />
</p>
<p align="center">
  <img src="./apps/web/public/readme/cron.png" width="45%" alt="Cron" />
  <img src="./apps/web/public/readme/skills.png" width="45%" alt="Skills" />
</p>
<p align="center">
  <img src="./apps/web/public/readme/usage.png" width="45%" alt="Usage" />
  <img src="./apps/web/public/readme/files.png" width="45%" alt="Files" />
</p>

## Contributing

Found a bug? Have a feature idea? Open an issue or PR. Feedback welcome.

## License

MIT
