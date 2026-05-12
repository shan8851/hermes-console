import type { SkillReadinessStatus } from '@hermes-console/runtime';

const LABELS: Record<SkillReadinessStatus, string> = {
  available: 'available',
  parse_issue: 'parse issue',
  setup_needed: 'setup needed',
  unknown: 'unknown',
  unsupported: 'unsupported'
};

const TONES: Record<SkillReadinessStatus, string> = {
  available: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  parse_issue: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  setup_needed: 'border-sky-500/30 bg-sky-500/10 text-sky-300',
  unknown: 'border-border bg-bg/50 text-fg-muted',
  unsupported: 'border-rose-500/30 bg-rose-500/10 text-rose-300'
};

export function SkillReadinessBadge({ status }: { status: SkillReadinessStatus }) {
  return (
    <span
      className={[
        'inline-flex items-center rounded-full border px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.16em]',
        TONES[status]
      ].join(' ')}
    >
      {LABELS[status]}
    </span>
  );
}
