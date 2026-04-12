import { useQuery } from '@tanstack/react-query';

import { appMetaQueryOptions } from '@/lib/api';
import type { RuntimeOverviewSummary } from '@hermes-console/runtime';

function formatTimestamp(value: string | null): string {
  if (!value) {
    return '—';
  }

  return new Date(value).toLocaleString();
}

function statusClass(status: 'ready' | 'missing' | 'partial' | 'running' | 'stopped' | 'unknown' | 'up_to_date' | 'behind') {
  if (status === 'ready' || status === 'running' || status === 'up_to_date') {
    return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200';
  }

  if (status === 'missing' || status === 'stopped') {
    return 'border-red-500/30 bg-red-500/10 text-red-200';
  }

  if (status === 'partial' || status === 'behind') {
    return 'border-amber-500/30 bg-amber-500/10 text-amber-200';
  }

  return 'border-border/80 bg-bg/40 text-fg-muted';
}

function RuntimeCard({
  label,
  value,
  detail
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <article className="rounded-lg border border-border/70 bg-bg/40 p-4">
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-fg-faint">{label}</p>
      <p className="mt-2 text-sm font-medium text-fg-strong">{value}</p>
      <p className="mt-2 text-sm leading-6 text-fg-muted">{detail}</p>
    </article>
  );
}

export function OverviewRuntimeInstall({ overview }: { overview: RuntimeOverviewSummary }) {
  const appMetaQuery = useQuery({
    ...appMetaQueryOptions(),
    retry: false
  });
  const appMeta = appMetaQuery.data;
  const connectedPlatforms = appMeta?.connectedPlatforms ?? overview.connectedPlatforms;
  const updateStatusLabel = appMeta?.updateStatus ?? overview.updateStatus;
  const updateBehind = appMeta?.updateBehind ?? overview.updateBehind;
  const installStatusLabel = appMeta?.installStatus ?? overview.installStatus;
  const gatewayStateLabel = appMeta?.gatewayState ?? overview.gatewayState;
  const runtimeVersionLabel = appMeta?.hermesVersion ?? 'Unknown';
  const runtimeBuildPrefix = appMeta?.hermesBuildDate ? `Build ${appMeta.hermesBuildDate}. ` : '';
  const runtimeVersionDetail =
    updateBehind != null && updateBehind > 0
      ? `${runtimeBuildPrefix}${updateBehind} commit${updateBehind === 1 ? '' : 's'} behind. Checked ${formatTimestamp(appMeta?.updateCheckedAt ?? null)}.`
      : `${runtimeBuildPrefix}Update status ${updateStatusLabel.replace('_', ' ')}. Checked ${formatTimestamp(appMeta?.updateCheckedAt ?? null)}.`;

  return (
    <section className="rounded-lg border border-border bg-surface/70 p-4">
      <div className="flex flex-wrap items-center gap-3">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-accent">Runtime</p>
        <span
          className={[
            'rounded-full border px-2 py-0.5 font-mono text-[11px] uppercase tracking-[0.16em]',
            statusClass(installStatusLabel)
          ].join(' ')}
        >
          install {installStatusLabel}
        </span>
        <span
          className={[
            'rounded-full border px-2 py-0.5 font-mono text-[11px] uppercase tracking-[0.16em]',
            statusClass(gatewayStateLabel)
          ].join(' ')}
        >
          gateway {gatewayStateLabel}
        </span>
        <span
          className={[
            'rounded-full border px-2 py-0.5 font-mono text-[11px] uppercase tracking-[0.16em]',
            statusClass(updateStatusLabel)
          ].join(' ')}
        >
          update {updateStatusLabel.replace('_', ' ')}
        </span>
      </div>
      <h3 className="mt-3 font-[family-name:var(--font-bricolage)] text-xl font-semibold tracking-tight text-fg-strong">
        Hermes runtime and install detail
      </h3>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-fg-muted">
        Surface the Hermes-native signals that matter most: install health, version drift, gateway state, connected
        platforms, and how many agents are actually available.
      </p>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <RuntimeCard
          label="root path"
          value={appMeta?.rootPath ?? 'Unavailable'}
          detail={appMeta?.rootKind ? `Detected via ${appMeta.rootKind.replace('_', ' ')} configuration.` : 'App metadata is currently unavailable.'}
        />
        <RuntimeCard
          label="version"
          value={runtimeVersionLabel}
          detail={runtimeVersionDetail}
        />
        <RuntimeCard
          label="connected platforms"
          value={connectedPlatforms.length > 0 ? connectedPlatforms.join(', ') : 'None detected'}
          detail={`Configured ${overview.configuredPlatformCount} platform${overview.configuredPlatformCount === 1 ? '' : 's'} across this Hermes root.`}
        />
        <RuntimeCard
          label="agents available"
          value={`${overview.availableAgentCount}/${overview.totalAgentCount}`}
          detail={`${overview.doctorIssueCount} doctor issue${overview.doctorIssueCount === 1 ? '' : 's'} currently surfaced by live diagnostics.`}
        />
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <article className="rounded-lg border border-border/70 bg-bg/40 p-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-fg-faint">gateway and runtime</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-sm font-medium text-fg-strong">Gateway state</p>
              <p className="mt-1 text-sm leading-6 text-fg-muted">{gatewayStateLabel}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-fg-strong">Gateway updated</p>
              <p className="mt-1 text-sm leading-6 text-fg-muted">{formatTimestamp(overview.gatewayUpdatedAt)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-fg-strong">Install status</p>
              <p className="mt-1 text-sm leading-6 text-fg-muted">{installStatusLabel}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-fg-strong">Update checked</p>
              <p className="mt-1 text-sm leading-6 text-fg-muted">{formatTimestamp(appMeta?.updateCheckedAt ?? null)}</p>
            </div>
          </div>
        </article>

        <article className="rounded-lg border border-border/70 bg-bg/40 p-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-fg-faint">platform state</p>
          {connectedPlatforms.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {connectedPlatforms.map((platform) => (
                <span
                  key={platform}
                  className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.16em] text-emerald-200"
                >
                  {platform}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm leading-6 text-fg-muted">No live connected platforms were detected.</p>
          )}
          <p className="mt-3 text-sm leading-6 text-fg-muted">
            Hermes Console keeps this panel focused on Hermes-native install and runtime state rather than generic repo
            inventory.
          </p>
        </article>
      </div>
    </section>
  );
}
