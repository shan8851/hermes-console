import { useState } from 'react';

import type { AttentionItem, RuntimeOverviewSummary } from '@hermes-console/runtime';

import { isAllProfilesScope, type ProfileScopeId } from '@/features/profile-scope/profile-scope';

const ATTENTION_PREVIEW_LIMIT = 5;

const PROFILE_AWARE_DOMAINS = new Set<AttentionItem['domain']>(['config', 'cron', 'files', 'memory', 'sessions']);

const severityClasses: Record<AttentionItem['severity'], string> = {
  critical: 'border-rose-500/35 bg-rose-500/10 text-rose-200',
  warning: 'border-amber-500/35 bg-amber-500/10 text-amber-200',
  info: 'border-sky-500/30 bg-sky-500/8 text-sky-200'
};

const severityDotClasses: Record<AttentionItem['severity'], string> = {
  critical: 'bg-rose-300 shadow-[0_0_18px_rgba(251,113,133,0.45)]',
  warning: 'bg-amber-300 shadow-[0_0_18px_rgba(251,191,36,0.35)]',
  info: 'bg-sky-300'
};

const severityLabels: Record<AttentionItem['severity'], string> = {
  critical: 'critical',
  warning: 'warning',
  info: 'info'
};

const appendProfileSearch = ({ href, profileScope }: { href: string; profileScope: ProfileScopeId }): string => {
  if (isAllProfilesScope(profileScope)) {
    return href;
  }

  const [rawPathname, rawSearch = ''] = href.split('?');
  const pathname = rawPathname ?? href;
  const search = new URLSearchParams(rawSearch);
  search.set('profile', profileScope);
  const serializedSearch = search.toString();

  return serializedSearch ? `${pathname}?${serializedSearch}` : pathname;
};

export const createAttentionHref = ({
  item,
  profileScope
}: {
  item: AttentionItem;
  profileScope: ProfileScopeId;
}): string | null => {
  if (!item.href) {
    return null;
  }

  if (!PROFILE_AWARE_DOMAINS.has(item.domain) || item.href.startsWith('/cron/')) {
    return item.href;
  }

  return appendProfileSearch({
    href: item.href,
    profileScope
  });
};

export const getVisibleAttentionItems = ({
  expanded,
  items
}: {
  expanded: boolean;
  items: AttentionItem[];
}): AttentionItem[] => (expanded ? items : items.slice(0, ATTENTION_PREVIEW_LIMIT));

function AttentionItemContent({ item }: { item: AttentionItem }) {
  return (
    <>
      <div className="flex items-start gap-3">
        <span
          className={['mt-1.5 inline-block h-2.5 w-2.5 shrink-0 rounded-full', severityDotClasses[item.severity]].join(
            ' '
          )}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium text-fg-strong">{item.title}</p>
            <span
              className={[
                'rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em]',
                severityClasses[item.severity]
              ].join(' ')}
            >
              {severityLabels[item.severity]}
            </span>
            <span className="rounded-full border border-border/70 bg-bg/40 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-fg-faint">
              {item.domain}
            </span>
          </div>
          <p className="mt-1.5 text-sm leading-6 text-fg-muted">{item.summary}</p>
          {item.evidence ? <p className="mt-2 break-all font-mono text-xs text-fg-faint">{item.evidence}</p> : null}
        </div>
      </div>
    </>
  );
}

function AttentionItemCard({ href, item }: { href: string | null; item: AttentionItem }) {
  const className = [
    'block rounded-md border border-border/70 bg-bg/35 px-4 py-3 transition-colors',
    href ? 'hover:border-accent/35 hover:bg-white/3' : ''
  ].join(' ');

  if (href) {
    return (
      <a href={href} className={className}>
        <AttentionItemContent item={item} />
      </a>
    );
  }

  return (
    <article className={className}>
      <AttentionItemContent item={item} />
    </article>
  );
}

export function OverviewAttention({
  overview,
  profileScope
}: {
  overview: RuntimeOverviewSummary;
  profileScope: ProfileScopeId;
}) {
  const [expanded, setExpanded] = useState(false);
  const attentionItems = overview.attentionItems;
  const visibleItems = getVisibleAttentionItems({
    expanded,
    items: attentionItems
  });
  const hiddenCount = attentionItems.length - visibleItems.length;

  return (
    <section className="rounded-lg border border-border bg-surface/70 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-accent">Needs attention</p>
          <h3 className="mt-2 font-[family-name:var(--font-bricolage)] text-xl font-semibold tracking-tight text-fg-strong">
            Operator queue
          </h3>
        </div>
        {attentionItems.length > ATTENTION_PREVIEW_LIMIT ? (
          <button
            type="button"
            onClick={() => setExpanded((previous) => !previous)}
            className="rounded-md border border-border/80 bg-bg/40 px-3 py-1.5 text-xs text-fg-muted transition-colors hover:border-accent/35 hover:text-fg"
          >
            {expanded ? 'Show less' : `Show all ${attentionItems.length}`}
          </button>
        ) : null}
      </div>

      {attentionItems.length === 0 ? (
        <div className="mt-4 rounded-md border border-border/70 bg-bg/35 px-4 py-3 text-sm leading-6 text-fg-muted">
          Nothing urgent found.
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {visibleItems.map((item) => (
            <AttentionItemCard
              key={item.id}
              href={createAttentionHref({
                item,
                profileScope
              })}
              item={item}
            />
          ))}
          {hiddenCount > 0 ? (
            <p className="px-1 text-xs leading-5 text-fg-faint">
              {hiddenCount} lower-priority item{hiddenCount === 1 ? '' : 's'} hidden.
            </p>
          ) : null}
        </div>
      )}
    </section>
  );
}
