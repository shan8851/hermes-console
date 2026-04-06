# Hermes Console — Structure Working Document

_Last updated: 2026-04-06_

## What Hermes Console is

Hermes Console is a local-first dashboard for inspecting a real Hermes Agent setup without living in the terminal.

It is intentionally split into three layers:

- `packages/runtime` — pure shared contracts, schemas, and domain helpers
- `apps/api` — local Hono API that reads Hermes state from disk and exposes `/api/*`
- `apps/web` — Vite + React UI that talks only to the API layer

That split is now the main mental model for the codebase.

---

## Monorepo shape

### Root

Key files:

- `package.json`
  - workspace-level scripts: `dev`, `build`, `start`, `test`, `typecheck`, `lint`
- `pnpm-workspace.yaml`
  - defines the workspace packages
- `tsconfig.base.json`
  - shared TypeScript base config
- `README.md`
  - product-level overview / setup
- `AGENTS.md`
  - implementation stance and repo rules

Use the root when you want to:

- run the whole app
- run all checks
- understand the overall repo split

### `packages/runtime`

Purpose:

- shared source of truth for contracts and pure data/domain logic
- no filesystem access
- no HTTP server logic
- no React

Important files:

- `packages/runtime/src/index.ts`
  - main export surface
- `packages/runtime/src/api.ts`
  - shared API envelope + meta schemas
- `packages/runtime/src/hermes-query.ts`
  - query issue/status contracts
- `packages/runtime/src/runtime-overview/types.ts`
  - overview-related shared types/schemas
- `packages/runtime/src/runtime-overview/runtime-artifacts.ts`
  - parsing helpers for runtime files / status artifacts
- `packages/runtime/src/runtime-overview/compose-runtime-overview.ts`
  - pure overview composition logic
- `packages/runtime/src/{cron,inventory,key-files,memory,sessions,skills,usage}/types.ts`
  - domain schemas/types per feature area

This package is where shared meaning should live.

If something is:

- a schema
- a normalized type
- a pure helper
- a cross-package contract

…it probably belongs here.

### `apps/api`

Purpose:

- the local Node/Hono server
- filesystem and subprocess boundary
- reads Hermes state from disk
- normalizes local artifacts into API responses
- serves the built web app in production

Important files:

- `apps/api/src/index.ts`
  - server entrypoint
- `apps/api/src/config.ts`
  - env loading and server config (`PORT`, repo root, web dist path)
- `apps/api/src/app.ts`
  - Hono app wiring and route registration
- `apps/api/src/static-site.ts`
  - static file / SPA fallback handling
- `apps/api/src/lib/http-envelope.ts`
  - converts query results into API response envelopes
- `apps/api/src/lib/query-issue-factories.ts`
  - issue helper factories
- `apps/api/src/lib/read-result.ts`
  - shared read result wrapper pattern
- `apps/api/src/lib/read-text-file-result.ts`
  - text-file read classification: ready / missing / unreadable

Feature folders:

- `apps/api/src/features/runtime-overview/*`
- `apps/api/src/features/inventory/*`
- `apps/api/src/features/sessions/*`
- `apps/api/src/features/cron/*`
- `apps/api/src/features/skills/*`
- `apps/api/src/features/memory/*`
- `apps/api/src/features/key-files/*`
- `apps/api/src/features/usage/*`

Pattern:

- feature readers gather local data
- source parsing happens here at the ingestion boundary
- shared schemas/types come from `@hermes-console/runtime`
- API returns snapshot/data envelopes for web consumption

### `apps/web`

Purpose:

- Vite React frontend
- TanStack Router for route ownership
- React Query for cached server state
- page composition and operator-facing UI

Important files:

- `apps/web/src/main.tsx`
  - app bootstrap
- `apps/web/src/router.tsx`
  - route tree, route loaders, selected-preview prefetch logic
- `apps/web/src/lib/api.ts`
  - web-side query options + runtime-validated response fetchers
- `apps/web/src/lib/query-client.ts`
  - query client setup
- `apps/web/src/lib/navigation.ts`
  - nav config

Shared shell:

- `apps/web/src/components/app-shell/*`
- `apps/web/src/components/ui/*`
- `apps/web/src/components/route-error.tsx`
- `apps/web/src/components/route-pending.tsx`

Pages:

- `apps/web/src/routes/pages/home-page.tsx`
- `sessions-page.tsx`
- `cron-page.tsx`
- `cron-detail-page.tsx`
- `skills-page.tsx`
- `skill-detail-page.tsx`
- `memory-page.tsx`
- `files-page.tsx`
- `usage-page.tsx`

Feature UI lives under:

- `apps/web/src/features/*/components/*`

Rule of thumb:

- web should render and orchestrate
- web should not parse raw Hermes files
- web should trust only runtime-validated API responses

---

## How the pieces tie together

## End-to-end request flow

For a typical page:

1. Web route loader in `apps/web/src/router.tsx` decides which queries are needed
2. Query option comes from `apps/web/src/lib/api.ts`
3. Fetch hits a local API endpoint like `/api/runtime/overview`
4. Route in `apps/api/src/app.ts` calls a feature query/reader
5. Reader in `apps/api/src/features/...` pulls from:
   - local Hermes files
   - SQLite-backed state
   - CLI diagnostics
   - normalized directories / JSON files
6. Shared schemas and pure composition come from `packages/runtime`
7. API wraps result into a snapshot/data envelope
8. Web validates the response against runtime schemas
9. Components render query status + data

## The main contract boundary

The most important boundary now is:

- **raw local Hermes source** -> `apps/api`
- **shared normalized contract** -> `packages/runtime`
- **rendered operator UI** -> `apps/web`

If that boundary starts blurring again, the codebase will get slippery fast.

---

## Feature map: where to look

## Overview / runtime health

If you are debugging the Overview page, start here:

- Web page: `apps/web/src/routes/pages/home-page.tsx`
- Overview UI components: `apps/web/src/features/runtime-overview/components/*`
- Web query wiring: `apps/web/src/lib/api.ts`
- API query composition: `apps/api/src/features/runtime-overview/query-runtime-overview.ts`
- Shell/topbar runtime status: `apps/api/src/features/runtime-overview/query-shell-status.ts`
- CLI diagnostics: `apps/api/src/features/runtime-overview/hermes-cli-diagnostics.ts`
- Pure composition: `packages/runtime/src/runtime-overview/compose-runtime-overview.ts`
- Parsing helpers: `packages/runtime/src/runtime-overview/runtime-artifacts.ts`
- Shared types: `packages/runtime/src/runtime-overview/types.ts`

Look here when:

- topbar state looks wrong
- overview counts look off
- gateway/update/config info is missing or misclassified
- runtime issues seem mislabeled

## Inventory / installation discovery

- API query: `apps/api/src/features/inventory/query-inventory.ts`
- Installation discovery: `apps/api/src/features/inventory/discover-installation.ts`
- Path resolution: `apps/api/src/features/inventory/resolve-path-config.ts`
- Filesystem access: `apps/api/src/features/inventory/node-file-system.ts`
- Shared inventory types: `packages/runtime/src/inventory/types.ts`
- Shared discovery shapes: `packages/runtime/src/inventory/discovery.ts`

Look here when:

- Hermes root path is wrong
- env overrides are behaving strangely
- profiles/install state look wrong

## Sessions / usage

- API query: `apps/api/src/features/sessions/query-sessions.ts`
- SQLite bridge + session source handling: `apps/api/src/features/sessions/node-session-sources.ts`
- Session normalization: `apps/api/src/features/sessions/read-sessions.ts`
- Cron session linkage: `apps/api/src/features/sessions/read-cron-job-index.ts`
- Usage query: `apps/api/src/features/usage/query-usage.ts`
- Usage read logic: `apps/api/src/features/usage/read-usage.ts`
- Shared session types: `packages/runtime/src/sessions/types.ts`
- Shared usage types: `packages/runtime/src/usage/types.ts`

Look here when:

- sessions disappear unexpectedly
- usage totals are wrong
- state.db parsing breaks
- token/cost summaries drift

## Cron

- API query: `apps/api/src/features/cron/query-cron.ts`
- Cron detail query: `apps/api/src/features/cron/read-cron-detail.ts`
- Cron read/normalize: `apps/api/src/features/cron/read-cron.ts`
- Raw cron source reads: `apps/api/src/features/cron/node-cron-sources.ts`
- Hermes cron aggregation: `apps/api/src/features/cron/read-hermes-cron.ts`
- Shared cron types: `packages/runtime/src/cron/types.ts`

Look here when:

- jobs don’t appear
- outputs are missing
- state / repeat / scheduling info looks wrong
- cron job source JSON drifts

## Skills

- Skills index query: `apps/api/src/features/skills/query-skills.ts`
- Skill detail query: `apps/api/src/features/skills/query-skill-detail.ts`
- Skill reads: `apps/api/src/features/skills/read-skills.ts`, `read-skill-detail.ts`, `read-skills-index.ts`
- Skill file system access: `apps/api/src/features/skills/node-skills-file-system.ts`
- Shared skill types: `packages/runtime/src/skills/types.ts`
- Shared category helpers: `packages/runtime/src/skills/compare-skill-categories.ts`
- Web detail route/page: `apps/web/src/routes/pages/skill-detail-page.tsx`
- Web viewer: `apps/web/src/features/skills/components/skill-file-viewer.tsx`

Look here when:

- skill parsing seems wrong
- linked file previews fail
- category ordering or summaries look off

## Files / key files

- Files route/page: `apps/web/src/routes/pages/files-page.tsx`
- Files route loader behavior: `apps/web/src/router.tsx`
- API query: `apps/api/src/features/key-files/query-key-files.ts`
- Discovery logic: `apps/api/src/features/key-files/discover-key-files.ts`
- Selected file content: `apps/api/src/features/key-files/read-key-file-content.ts`
- File-system access: `apps/api/src/features/key-files/node-key-files-file-system.ts`
- Shared key-file types: `packages/runtime/src/key-files/types.ts`

Look here when:

- file discovery is incomplete
- preview loading is wrong
- invalid `?file=` links behave weirdly
- workspace-root vs Hermes-root scoping is suspect

## Memory

- API query: `apps/api/src/features/memory/query-memory.ts`
- Read logic: `apps/api/src/features/memory/read-memory.ts`, `read-memory-files.ts`
- File-system access: `apps/api/src/features/memory/node-memory-file-system.ts`
- Shared memory types: `packages/runtime/src/memory/types.ts`

Look here when:

- memory pressure badges feel wrong
- MEMORY.md / USER.md parsing is off
- limits or usage percentages look weird

---

## Route and query ownership: current mental model

## Route ownership

The route tree lives in `apps/web/src/router.tsx`.

This is where to look for:

- which query is preloaded for each page
- how URL search params affect loader behavior
- how selected file previews are prefetched for `/files` and `/skills/$skillId`

Current behavior to remember:

- selected preview ownership is **route-aware now**, not purely local component state
- invalid `?file=` deep links are intentionally preserved as **inline preview errors**, not route failures

## Query wiring

The web query contract lives in `apps/web/src/lib/api.ts`.

That file is the map between:

- route/component needs
- API endpoints
- runtime validation schemas
- query keys used by React Query

If you want to know:

- what endpoint a page uses
- what schema validates it
- what query key refresh/invalidation should target

…start there.

## Refresh behavior

Refresh is now explicitly targeted, not global.

Key file:

- `apps/web/src/components/ui/refresh-button.tsx`

Call sites now pass exact query keys. If refresh starts refetching too much again, check:

- the `queryKeys` passed at the page level
- the corresponding keys in `apps/web/src/lib/api.ts`

---

## API/server mental model

## What `app.ts` does

`apps/api/src/app.ts` is the HTTP boundary.

It should stay thin:

- register endpoints
- call feature query/read functions
- wrap results into envelopes
- keep error behavior predictable

If `app.ts` starts accumulating business logic, that is usually a smell.

## Static site serving

`apps/api/src/static-site.ts` now has a few important responsibilities:

- serve built asset files
- reject missing asset-like paths with 404
- fall back to `index.html` for route-like paths
- keep browser-facing static failures out of the JSON API error path

If browser navigation suddenly gets JSON 500s again, start here.

## File-read issue handling

A bunch of correctness work now relies on the read-result pattern.

Important files:

- `apps/api/src/lib/read-result.ts`
- `apps/api/src/lib/read-text-file-result.ts`
- `apps/api/src/lib/query-issue-factories.ts`

This matters because Console should distinguish:

- file missing
- file unreadable
- parse failed
- command failed
- missing dependency

If errors start silently collapsing into empty or unknown states again, check these paths first.

---

## Where bugs are most likely to show up again

## 1) Runtime artifact parsing drift

Most likely future trouble spot.

Files:

- `packages/runtime/src/runtime-overview/runtime-artifacts.ts`
- `packages/runtime/src/runtime-overview/compose-runtime-overview.ts`
- `apps/api/src/features/runtime-overview/hermes-cli-diagnostics.ts`

Why:

- these depend on Hermes file/CLI output shapes staying fairly stable
- small changes upstream can cause “technically works, subtly wrong” behavior

Symptoms:

- overview counts/statuses feel off
- topbar update/gateway/install states go weird
- missing/warning/partial signals become noisy or disappear

## 2) Source-boundary schema drift for cron/sessions

Files:

- `apps/api/src/features/sessions/node-session-sources.ts`
- `apps/api/src/features/cron/node-cron-sources.ts`
- `packages/runtime/src/sessions/types.ts`
- `packages/runtime/src/cron/types.ts`

Why:

- these now validate more honestly
- if Hermes raw source shapes change, parse failures will surface sooner
- good for correctness, but it means drift will show up here first

Symptoms:

- session rows or cron jobs suddenly drop
- parse_failed issues spike
- detail pages partially empty out

## 3) Route-loader / preview-state edge cases

Files:

- `apps/web/src/router.tsx`
- `apps/web/src/routes/pages/files-page.tsx`
- `apps/web/src/routes/pages/skill-detail-page.tsx`

Why:

- this area was the last bit of UI cleanup
- search-param-driven preview ownership can regress into duplicated fetches or wrong inline errors if touched carelessly

Symptoms:

- deep links load the wrong preview
- invalid `?file=` stops showing inline error
- route starts failing for bad preview ids

## 4) Refresh targeting drift

Files:

- `apps/web/src/components/ui/refresh-button.tsx`
- `apps/web/src/lib/api.ts`
- page call sites

Why:

- easy place for “just refetch everything” creep to come back

Symptoms:

- refresh on one page unexpectedly reloads unrelated sections
- topbar/app-meta gets hit too often
- page-specific refresh feels noisy or slow

## 5) Static site fallback regressions

File:

- `apps/api/src/static-site.ts`

Why:

- browser routing bugs can easily reappear if asset-like vs route-like behavior gets blurred again

Symptoms:

- missing JS/CSS returns HTML instead of 404
- route navigations return JSON error payloads
- production build works inconsistently

---

## Good debugging entry points

If something is wrong and you want the fastest start, use this shortlist.

## “The page is wrong”

Start with:

- `apps/web/src/routes/pages/<page>.tsx`
- `apps/web/src/lib/api.ts`
- matching API query file in `apps/api/src/features/.../query-*.ts`

## “The data is wrong before it gets to the page”

Start with:

- relevant `apps/api/src/features/.../read-*.ts`
- relevant source reader under `node-*.ts`
- shared runtime types/helpers in `packages/runtime/src/...`

## “The status/issue classification is wrong”

Start with:

- `apps/api/src/lib/query-issue-factories.ts`
- `apps/api/src/lib/read-result.ts`
- `apps/api/src/lib/read-text-file-result.ts`
- `packages/runtime/src/hermes-query.ts`

## “The route / deep link behavior is wrong”

Start with:

- `apps/web/src/router.tsx`
- page component for that route
- `apps/web/src/router.test.tsx`

## “Refresh is weird”

Start with:

- `apps/web/src/components/ui/refresh-button.tsx`
- page call site
- `apps/web/src/components/ui/refresh-button.test.tsx`

## “Build/start behavior is weird”

Start with:

- root `package.json`
- `apps/api/src/config.ts`
- `apps/api/src/static-site.ts`
- `apps/web/vite.config.ts`
- package-level `package.json` scripts

---

## Current architecture guardrails

These are worth keeping explicit.

- Keep `packages/runtime` pure.
- Keep raw filesystem/subprocess concerns in `apps/api`.
- Keep `apps/web` focused on route/query/render concerns.
- Keep query contracts validated at the web boundary.
- Keep preview/deep-link errors local when only the preview target is bad.
- Keep refresh scoped to explicit query keys.
- Prefer small feature-local helpers over rebuilding a giant shared abstraction too early.

---

## Areas that may deserve attention later

These are not urgent red alarms, just likely future maintenance points.

- runtime artifact parsing coverage could still be deeper
- some source schemas may need widening if Hermes raw file shapes evolve
- selected-preview route ownership is now decent, but worth watching if these routes get more complex
- route error UX is functional but still fairly plain
- refresh behavior is much better now, but query-key discipline matters going forward

---

## Practical “where should new code go?” guide

If you’re adding something new:

- **new shared schema or pure type/helper** -> `packages/runtime`
- **new local reader / file / subprocess integration** -> `apps/api`
- **new endpoint** -> `apps/api/src/app.ts` + feature query/read files
- **new page or route behavior** -> `apps/web/src/router.tsx` + `apps/web/src/routes/pages/*`
- **new page UI components** -> `apps/web/src/features/<feature>/components/*`
- **new query wiring** -> `apps/web/src/lib/api.ts`
- **new status/issue classification** -> API lib helpers + runtime query contracts

---

## Bottom line

Hermes Console is now understandable again if you hold onto one simple model:

- `runtime` defines the meaning
- `api` reads and normalizes the real local Hermes world
- `web` owns routes, queries, and presentation

When in doubt, follow the data from raw source -> API reader -> runtime schema/helper -> web query -> page component.

That path is the codebase.