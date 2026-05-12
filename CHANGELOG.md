# Changelog

## Unreleased

## 0.6.0 - 2026-05-12

- Added read-only session detail pages with transcript timelines, token/cost breakdowns, lineage metadata, and direct links from session search/list results.
- Added the Cron Reliability Console with health classification, URL-backed filters/sorts, dependency context, and Overview cron health links.
- Added log-derived warning/error events with bounded summaries, grouped event context, raw-line expansion, and best-effort links back to session detail pages.

## 0.5.0 - 2026-05-11

- Added a global profile scope selector that carries `?profile=` across profile-aware routes and keeps legacy session `?agent=` links working.
- Scoped sessions, cron, usage, logs, memory, files, config, skills, and Overview activity to selected Hermes profiles where the backing data supports it.
- Added a calmer Overview attention centre that prioritizes actionable cron, runtime, memory, config, skills, and log signals without promoting optional missing files as primary warnings.
- Moved raw low-level read diagnostics into an expandable Diagnostics section so debugging evidence remains available without dominating the dashboard.
- Clarified Overview behaviour so activity cards and agent lists can be profile-scoped while runtime, gateway, update, platform, and diagnostics state remain global.
- Flattened the topbar search/profile controls for a cleaner shell without redundant profile labels.
- Added route/component coverage for profile scoping, unknown-profile fallback, scoped Overview activity, and config empty states.

## 0.4.1 - 2026-05-11

- Updated Cron reads for current Hermes job metadata, including script-only/no-agent jobs, chained `context_from` jobs, per-job `enabled_toolsets`, and `workdir`.
- Surfaced the new cron execution metadata on the cron detail page so scheduler behaviour is visible without opening `jobs.json`.
- Added coverage for the newer cron job fields in the cron normalizer.

## 0.4.0 - 2026-04-13

- Added a new Config page with per-agent `config.yaml` inspection, root/profile tabs, raw YAML syntax highlighting, and explicit missing or unreadable states.
- Added `/api/config` plus shared runtime config types so the web app can expose Hermes config files as a first-class read-only surface.
- Expanded Overview runtime/install detail with clearer configuration posture and surfaced Hermes CLI version information more explicitly.
- Added GitHub Actions CI for pull requests and pushes to `main`, covering formatting, linting, typechecking, tests, and build, and aligned `pnpm release:check` with the same gate.
- Added targeted tests around config reads, config route states, runtime install detail, and Hermes CLI version parsing.

## 0.3.0 - 2026-04-12

- Reworked the shell for small screens so navigation collapses into a header and drawer instead of rendering the sidebar inline above the page.
- Expanded Cron with clearer health metadata, server-derived upcoming runs, a 7-day calendar view, and a detail page that separates observed execution health from saved output files.
- Fixed cron occurrence expansion in the built API/runtime path so high-frequency schedules render correctly outside the `tsx` dev server too.
- Cleaned up Sessions cards, replacing the confusing root-agent `Default` emphasis with clearer model and source context.
- Added usage charts for session/token trends and stacked token-category breakdowns.
- Added a new Logs page with bounded tail reads, search, level filtering, manual refresh, and opt-in 15-second auto-refresh.
- Expanded Hermes runtime visibility on Overview with a dedicated install/runtime panel covering root path, version drift, connected platforms, and agent availability.
- Added targeted tests for cron health derivation and bounded log-tail reads.

## 0.2.0 - 2026-04-10

- Added a global command palette with `Cmd/Ctrl+K` and `/` shortcuts for route, agent, session, cron, skill, and file search.
- Extended memory and usage views with stronger multi-agent support, including agent-aware filtering and agent-indexed memory inspection.
- Added filter improvements across sessions, cron, skills, usage, and memory, plus clearer empty states and reset actions.
- Polished the UI with breadcrumbs on detail pages, copy-to-clipboard actions, memory usage bars, and more explicit inline loading/error states.
- Added lightweight OSS release hygiene with a manual changelog, a release workflow doc, aligned workspace versioning, and a `release:check` script.
