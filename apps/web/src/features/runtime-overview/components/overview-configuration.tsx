import type { AccessCheckSummary, RuntimeOverviewSummary, RuntimeProfileItem } from '@hermes-console/runtime';

const statusColor = (status: AccessCheckSummary['status']) => {
  switch (status) {
    case 'available':
      return 'text-emerald-300';
    case 'missing':
      return 'text-rose-300';
    case 'warning':
      return 'text-amber-300';
    default:
      return 'text-fg-muted';
  }
};

const dotColor = (status: AccessCheckSummary['status']) => {
  switch (status) {
    case 'available':
      return 'bg-emerald-400';
    case 'missing':
      return 'bg-rose-400';
    case 'warning':
      return 'bg-amber-400';
    default:
      return 'bg-fg-faint';
  }
};

const runtimeDefaultLabels = ['model', 'search', 'approvals', 'security'] as const;
const voiceDefaultLabels = ['voice input', 'voice output'] as const;

const runtimeLabelCopy: Record<string, string> = {
  model: 'model',
  search: 'search',
  approvals: 'approvals',
  security: 'security',
  'voice input': 'voice in',
  'voice output': 'voice out'
};

function CredentialRow({ item }: { item: AccessCheckSummary }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <span className={['inline-block h-2 w-2 shrink-0 rounded-full', dotColor(item.status)].join(' ')} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-fg-strong">{item.name}</p>
        <p className="text-xs text-fg-muted">{item.detail}</p>
      </div>
      <span
        className={['shrink-0 font-mono text-[11px] uppercase tracking-[0.16em]', statusColor(item.status)].join(' ')}
      >
        {item.status}
      </span>
    </div>
  );
}

function RuntimeDefaultChip({ item }: { item: RuntimeProfileItem }) {
  const label = runtimeLabelCopy[item.label] ?? item.label;

  return (
    <article className="flex min-w-[13rem] flex-1 flex-col gap-1 rounded-xl border border-border/60 bg-surface/35 px-3 py-2.5">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-fg-faint">{label}</p>
      <p className="text-sm font-medium text-fg-strong">{item.value}</p>
      {item.detail ? <p className="text-xs leading-5 text-fg-muted">{item.detail}</p> : null}
    </article>
  );
}

export function OverviewConfiguration({ overview }: { overview: RuntimeOverviewSummary }) {
  const allCredentials = [...overview.access.authProviders, ...overview.access.apiKeys];
  const runtimeProfileByLabel = new Map(overview.runtimeProfile.map((item) => [item.label, item] as const));
  const runtimeDefaultItems = runtimeDefaultLabels.flatMap((label) => {
    const item = runtimeProfileByLabel.get(label);

    return item ? [item] : [];
  });
  const voiceDefaultItems = voiceDefaultLabels.flatMap((label) => {
    const item = runtimeProfileByLabel.get(label);

    return item ? [item] : [];
  });

  return (
    <section>
      <h3 className="mb-4 font-[family-name:var(--font-bricolage)] text-lg font-semibold text-fg-strong">
        Configuration
      </h3>

      <div className="rounded-lg border border-border/70 bg-bg/40 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-fg-faint">Runtime defaults</p>
          <p className="text-xs text-fg-faint">Compact posture snapshot for low-frequency settings.</p>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {runtimeDefaultItems.map((item) => (
            <RuntimeDefaultChip key={item.label} item={item} />
          ))}
        </div>

        {voiceDefaultItems.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2 border-t border-border/50 pt-3">
            {voiceDefaultItems.map((item) => (
              <span
                key={item.label}
                className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-surface/35 px-3 py-1.5 text-sm text-fg-muted"
              >
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-fg-faint">
                  {runtimeLabelCopy[item.label] ?? item.label}
                </span>
                <span className="text-fg-strong">{item.value}</span>
              </span>
            ))}
          </div>
        ) : null}
      </div>

      <div className="mt-4 rounded-lg border border-border/70 bg-bg/40 divide-y divide-border/50">
        <div className="px-4 py-2.5">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-fg-faint">Credentials</p>
        </div>
        {allCredentials.map((item) => (
          <CredentialRow key={item.name} item={item} />
        ))}
      </div>
    </section>
  );
}
