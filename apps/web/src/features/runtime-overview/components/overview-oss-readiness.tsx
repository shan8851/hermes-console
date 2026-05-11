import { BookOpen, GitBranch, LockKeyhole, PlayCircle } from 'lucide-react';

import { CopyButton } from '@/components/ui/copy-button';
import type { RuntimeOverviewSummary } from '@hermes-console/runtime';

const quickStartCommand = [
  'git clone https://github.com/shan8851/hermes-console.git',
  'cd hermes-console',
  'pnpm install',
  'cp .env.example .env.local',
  'pnpm dev'
].join('\n');

const workspaceCommand = 'HERMES_CONSOLE_WORKSPACE_DIR=/absolute/path/to/your/workspace';

function installationNudge(overview: RuntimeOverviewSummary): string {
  if (overview.installStatus === 'missing') {
    return 'Hermes was not found at this root. Set HERMES_CONSOLE_HERMES_DIR or install Hermes before expecting live runtime data.';
  }

  if (overview.installStatus === 'partial') {
    return 'Hermes is partially readable here. The UI will stay useful, but missing files and failed diagnostics are called out inline.';
  }

  return 'Hermes is readable. Use this page as the operator cockpit, then drill into cron, logs, usage, skills, memory, and files.';
}

const StepCard = ({
  title,
  detail,
  command,
  icon: Icon
}: {
  title: string;
  detail: string;
  command?: string;
  icon: typeof PlayCircle;
}) => (
  <article className="group rounded-xl border border-border/70 bg-bg/45 p-4 transition-colors hover:border-accent/35 hover:bg-bg/70">
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-start gap-3">
        <span className="rounded-lg border border-border/70 bg-surface p-2 text-accent">
          <Icon className="h-4 w-4" />
        </span>
        <div>
          <h4 className="font-[family-name:var(--font-bricolage)] text-base font-semibold tracking-tight text-fg-strong">
            {title}
          </h4>
          <p className="mt-2 text-sm leading-6 text-fg-muted">{detail}</p>
        </div>
      </div>
      {command ? <CopyButton value={command} ariaLabel={`Copy ${title} command`} variant="ghost" /> : null}
    </div>
    {command ? (
      <pre className="mt-4 whitespace-pre-wrap break-words rounded-lg border border-border/70 bg-surface/80 p-3 font-mono text-[11px] leading-5 text-fg-muted">
        <code>{command}</code>
      </pre>
    ) : null}
  </article>
);

export function OverviewOssReadiness({ overview }: { overview: RuntimeOverviewSummary }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-surface/80">
      <div className="grid gap-0 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="border-b border-border/70 p-5 xl:border-b-0 xl:border-r xl:p-6">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-accent">First-run path</p>
          <h3 className="mt-3 max-w-xl font-[family-name:var(--font-bricolage)] text-2xl font-semibold tracking-tight text-fg-strong">
            From clone to useful in a couple of minutes.
          </h3>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-fg-muted">
            Hermes Console should earn the GitHub star by being obvious: local-only by default, read-mostly, and
            explicit when your Hermes data is missing or partial.
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-border/70 bg-bg/40 p-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-fg-faint">runtime</p>
              <p className="mt-2 text-sm font-medium text-fg-strong">{overview.installStatus}</p>
            </div>
            <div className="rounded-lg border border-border/70 bg-bg/40 p-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-fg-faint">gateway</p>
              <p className="mt-2 text-sm font-medium text-fg-strong">{overview.gatewayState}</p>
            </div>
            <div className="rounded-lg border border-border/70 bg-bg/40 p-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-fg-faint">agents</p>
              <p className="mt-2 text-sm font-medium text-fg-strong">
                {overview.availableAgentCount}/{overview.totalAgentCount}
              </p>
            </div>
          </div>

          <p className="mt-4 rounded-lg border border-amber-500/25 bg-amber-500/10 p-3 text-sm leading-6 text-amber-100">
            {installationNudge(overview)}
          </p>
        </div>

        <div className="grid gap-3 p-4 lg:grid-cols-2 xl:p-5">
          <StepCard
            title="Run locally"
            detail="Clone, install, copy the example env file, and start the Vite dev server with the local API proxy."
            command={quickStartCommand}
            icon={PlayCircle}
          />
          <StepCard
            title="Point it at real context"
            detail="Set a workspace root if you want the Files page to include AGENTS.md, README files, and project instructions outside the Hermes root."
            command={workspaceCommand}
            icon={BookOpen}
          />
          <StepCard
            title="Stay local-first"
            detail="The API binds to 127.0.0.1 and has no built-in auth. Use SSH, Tailscale, or a protected reverse proxy if you deliberately expose it."
            icon={LockKeyhole}
          />
          <StepCard
            title="Contribute cleanly"
            detail="PRs run the same checks as pnpm release:check: format, lint, typecheck, tests, and build. No bespoke maintainer machine magic."
            command="pnpm release:check"
            icon={GitBranch}
          />
        </div>
      </div>
    </section>
  );
}
