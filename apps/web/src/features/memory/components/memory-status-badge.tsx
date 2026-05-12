import type { MemoryProviderStatus, MemoryStatusLevel } from '@hermes-console/runtime';

const MEMORY_LABELS: Record<MemoryStatusLevel, string> = {
  healthy: 'healthy',
  missing: 'missing',
  pressured: 'pressured',
  stale: 'stale',
  unknown: 'unknown'
};

const PROVIDER_LABELS: Record<MemoryProviderStatus, string> = {
  built_in_only: 'built-in only',
  configured: 'provider configured',
  provider_missing: 'provider missing',
  setup_needed: 'provider setup needed',
  unknown: 'provider unknown'
};

const TONES: Record<MemoryStatusLevel | MemoryProviderStatus, string> = {
  built_in_only: 'border-border bg-bg/50 text-fg-muted',
  configured: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  healthy: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  missing: 'border-rose-500/30 bg-rose-500/10 text-rose-300',
  pressured: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  provider_missing: 'border-rose-500/30 bg-rose-500/10 text-rose-300',
  setup_needed: 'border-sky-500/30 bg-sky-500/10 text-sky-300',
  stale: 'border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-300',
  unknown: 'border-border bg-bg/50 text-fg-muted'
};

export function MemoryStatusBadge({ level }: { level: MemoryStatusLevel }) {
  return (
    <span
      className={[
        'inline-flex items-center rounded-full border px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.16em]',
        TONES[level]
      ].join(' ')}
    >
      {MEMORY_LABELS[level]}
    </span>
  );
}

export function MemoryProviderBadge({ status }: { status: MemoryProviderStatus }) {
  return (
    <span
      className={[
        'inline-flex items-center rounded-full border px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.16em]',
        TONES[status]
      ].join(' ')}
    >
      {PROVIDER_LABELS[status]}
    </span>
  );
}
