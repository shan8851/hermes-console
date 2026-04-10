import { CopyButton } from '@/components/ui/copy-button';
import { EmptyState } from '@/components/ui/empty-state';
import { MemoryPressureBadge } from '@/features/memory/components/memory-pressure-badge';
import type { MemoryEntry, MemoryFileSummary } from '@hermes-console/runtime';

function formatLimitSource(source: MemoryFileSummary['scope'] | 'config' | 'default') {
  if (source === 'config') {
    return 'config';
  }

  if (source === 'default') {
    return 'default';
  }

  return source;
}

function getEntryLabel(index: number) {
  return `Block ${index + 1}`;
}

function getDisplayLabel(file: MemoryFileSummary) {
  return `${file.label}.md`;
}

function usageBarClass(level: MemoryFileSummary['pressureLevel']) {
  if (level === 'at_limit') {
    return 'bg-rose-400';
  }

  if (level === 'near_limit') {
    return 'bg-orange-400';
  }

  if (level === 'approaching_limit') {
    return 'bg-amber-400';
  }

  return 'bg-emerald-400';
}

export function MemoryFilePanel({
  file,
  limitSource,
  matchedByRawContent = false,
  searchQuery = '',
  visibleEntries = file.entries
}: {
  file: MemoryFileSummary;
  limitSource: 'config' | 'default';
  matchedByRawContent?: boolean;
  searchQuery?: string;
  visibleEntries?: MemoryEntry[];
}) {
  const isSearching = searchQuery.trim().length > 0;
  const visibleEntryCountLabel =
    isSearching && visibleEntries.length !== file.entries.length
      ? `${visibleEntries.length}/${file.entries.length} visible blocks`
      : `${file.entries.length} saved blocks`;

  return (
    <section className="rounded-lg border border-border bg-surface/70 p-4 xl:h-[56rem] xl:overflow-auto">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-fg-faint">{getDisplayLabel(file)}</p>
          <h3 className="mt-2 font-[family-name:var(--font-bricolage)] text-lg font-semibold text-fg-strong">
            {file.exists ? `${visibleEntryCountLabel} · ${file.charCount}/${file.limit}` : 'file missing'}
          </h3>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <p className="break-all text-sm leading-6 text-fg-muted">{file.filePath}</p>
            <CopyButton ariaLabel={`Copy ${getDisplayLabel(file)} path`} value={file.filePath} />
          </div>
          {file.exists ? (
            <p className="mt-2 text-sm leading-6 text-fg-muted">
              Hermes stores this as one markdown file; the blocks below are parsed from saved sections so the file stays
              scannable.
            </p>
          ) : null}
        </div>
        <MemoryPressureBadge level={file.pressureLevel} />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-md border border-border/70 bg-bg/40 p-3">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-fg-faint">usage</p>
          <p className="mt-2 font-[family-name:var(--font-bricolage)] text-xl font-semibold text-fg-strong">
            {file.usagePercentage}%
          </p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-bg/70">
            <div
              className={['h-full rounded-full transition-[width]', usageBarClass(file.pressureLevel)].join(' ')}
              style={{ width: `${Math.min(file.usagePercentage, 100)}%` }}
            />
          </div>
        </div>
        <div className="rounded-md border border-border/70 bg-bg/40 p-3">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-fg-faint">limit source</p>
          <p className="mt-2 text-sm text-fg-strong">{formatLimitSource(limitSource)}</p>
        </div>
        <div className="rounded-md border border-border/70 bg-bg/40 p-3">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-fg-faint">pressure</p>
          <p className="mt-2 text-sm text-fg-strong">{file.pressureLevel.replaceAll('_', ' ')}</p>
        </div>
      </div>

      {file.exists ? (
        <>
          {isSearching && matchedByRawContent ? (
            <div className="mt-4 rounded-md border border-accent/30 bg-accent/10 p-3 text-sm leading-6 text-fg-muted">
              Search matched this file’s raw content. Full file context is still shown below.
            </div>
          ) : null}

          {file.preamble ? (
            <div className="mt-4 rounded-md border border-border/70 bg-bg/40 p-3">
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-fg-faint">file preamble</p>
              <pre className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-fg-muted">
                {file.preamble}
              </pre>
            </div>
          ) : null}

            <div className="mt-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-fg-faint">saved blocks</p>
                <p className="text-xs text-fg-muted">ordered as they appear in the file, not native Hermes IDs</p>
              </div>

            {visibleEntries.length > 0 ? (
              <div className="space-y-3">
                {visibleEntries.map((entry, index) => (
                  <article key={entry.id} className="rounded-md border border-border/70 bg-bg/40 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-fg-faint">
                        {getEntryLabel(index)}
                      </p>
                      <p className="text-xs text-fg-muted">{entry.charCount} chars</p>
                    </div>
                    <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-fg">{entry.content}</p>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState
                eyebrow={isSearching ? 'No matches' : 'No blocks'}
                title={isSearching ? 'No saved blocks matched this search' : 'No parsed saved blocks yet'}
                description={
                  isSearching
                    ? 'Try a different term or clear the memory search to restore the full file view.'
                    : 'The file exists, but there are no parsed saved blocks yet.'
                }
              />
            )}
          </div>
        </>
      ) : (
        <div className="mt-4 rounded-md border border-dashed border-border/80 p-3 text-sm leading-6 text-fg-muted">
          This file was not found under the resolved Hermes root.
        </div>
      )}
    </section>
  );
}
