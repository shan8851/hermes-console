import type { ReactNode } from 'react';

function toneClass(tone: 'default' | 'danger') {
  if (tone === 'danger') {
    return 'border-rose-500/30 bg-rose-500/10';
  }

  return 'border-dashed border-border/80 bg-bg/20';
}

export function EmptyState({
  title,
  description,
  action,
  eyebrow,
  tone = 'default'
}: {
  title: string;
  description: string;
  action?: ReactNode;
  eyebrow?: string;
  tone?: 'default' | 'danger';
}) {
  return (
    <section className={['rounded-lg border p-4', toneClass(tone)].join(' ')}>
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-fg-faint">{eyebrow ?? 'Empty state'}</p>
      <h3 className="mt-3 font-[family-name:var(--font-bricolage)] text-lg font-semibold text-fg-strong">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-fg-muted">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </section>
  );
}
