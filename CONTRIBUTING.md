# Contributing to Hermes Console

Hermes Console is a local-first, read-mostly UI for inspecting Hermes Agent state. Contributions should keep that product shape intact: calm operator UX, explicit missing/partial states, and no mutation-heavy control-plane theatre.

## Local setup

```bash
git clone https://github.com/shan8851/hermes-console.git
cd hermes-console
pnpm install
cp .env.example .env.local
pnpm dev
```

Open `http://localhost:5173` for the Vite app. The API binds to `127.0.0.1` and the web app proxies `/api` to it during development.

Useful optional environment variables:

```bash
HERMES_CONSOLE_HERMES_DIR=/absolute/path/to/.hermes
HERMES_CONSOLE_WORKSPACE_DIR=/absolute/path/to/workspace
HERMES_CONSOLE_HERMES_BIN=hermes
PORT=3940
```

## Quality bar

Before opening a PR, run the same gate CI runs:

```bash
pnpm release:check
```

That covers formatting, linting, typechecking, tests, and build.

If you are iterating on a smaller change, the usual split is:

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## Product constraints

Do:

- keep `packages/runtime` pure and framework-free
- keep filesystem and CLI reads in `apps/api`
- keep the web app talking only to `/api/*`
- add explicit loading, empty, partial, and error states
- add tests for parsers, readers, normalizers, and non-trivial UI helpers
- preserve local-first defaults and read-only posture

Do not:

- add chat-client scope
- add terminal-emulator scope
- add full file manager/editor scope
- add hosted SaaS assumptions
- hide missing local data behind fake demo data in the main runtime path
- expose the API beyond localhost by default

## Pull request checklist

- [ ] The change has a clear user-facing reason.
- [ ] Missing or unreadable Hermes data degrades explicitly.
- [ ] Tests were added or updated where logic changed.
- [ ] `pnpm release:check` passes locally.
- [ ] README, changelog, or docs were updated when behaviour changed.
