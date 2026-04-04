# AGENTS.md — Hermes Console

## What this is
Hermes Console is a local-first Next.js web app for inspecting Hermes Agent setups.

It is:
- Hermes-native
- read-mostly at launch
- visibility-first, not chat-first
- intended as a clean, focused product

## Product priorities
When working in this repo, optimise for:
1. legibility
2. calm operator UX
3. simple local setup
4. modular code structure
5. strong naming and obvious file organisation
6. small, testable units

## Non-goals for v1
Do not let the repo drift into:
- generic multi-agent platform abstractions
- terminal emulator work
- chat-client parity work
- full file manager/editor scope
- enterprise auth / RBAC theatre
- Shan-specific bespoke workflow surfaces as core primitives

## Code structure expectations
- Prefer small composable components over giant page files.
- Keep reader/parsing logic out of UI components.
- Create explicit internal types for each source family.
- Prefer strong names that explain intent: `CronJobsTable`, `readSkillsIndex`, `formatMemoryUsage`.
- Keep file and folder structure obvious and domain-led.
- Avoid catch-all `utils` dumping grounds when a domain module is clearer.

## Testing expectations
Add unit tests for:
- readers
- parsers
- normalizers
- schedule / usage / warning calculations
- any non-trivial UI state helpers

If logic is important enough to deserve a helper, it usually deserves a test.

## Local config expectations
Expect `.env.local` for local overrides.
Planned important env vars:
- `HERMES_CONSOLE_HERMES_DIR`
- `HERMES_CONSOLE_WORKSPACE_DIR`

Default assumption is a standard Hermes setup under `~/.hermes`.

## UX expectations
- Dark-first.
- Giles-style information clarity.
- Hermes-style branding and accents.
- Dense but breathable layouts.
- Make important state obvious in one screen when possible.
- Avoid noisy dashboards and fake enterprise complexity.

## Before major implementation work
Check:
- `docs/prd.md`
- `docs/implementation-plan.md`
- this file

If implementation starts drifting from the product thesis, stop and simplify.
