import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';

import { appMetaQueryOptions } from '@/lib/api';

function gatewayClass(state: string) {
  if (state === 'running') {
    return 'border-emerald-500/25 bg-emerald-500/10 text-emerald-200';
  }

  if (state === 'stopped') {
    return 'border-rose-500/25 bg-rose-500/10 text-rose-200';
  }

  return 'border-amber-500/25 bg-amber-500/10 text-amber-200';
}

function installClass(status: string) {
  if (status === 'missing') {
    return 'border-rose-500/25 bg-rose-500/10 text-rose-200';
  }

  return 'border-amber-500/25 bg-amber-500/10 text-amber-200';
}

function SearchButton({ onOpenCommandPalette }: { onOpenCommandPalette: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpenCommandPalette}
      className="inline-flex items-center gap-2 rounded-xl border border-border/70 bg-bg/35 px-3 py-2.5 text-sm text-fg-muted transition-colors hover:border-accent/35 hover:text-fg"
    >
      <Search className="h-4 w-4" />
      <span>Search</span>
      <span className="rounded-md bg-white/5 px-2 py-1 font-mono text-[11px] uppercase tracking-[0.16em] text-fg-faint">
        Cmd/Ctrl+K
      </span>
      <span className="rounded-md bg-white/5 px-2 py-1 font-mono text-[11px] uppercase tracking-[0.16em] text-fg-faint">
        /
      </span>
    </button>
  );
}

export function AppTopbar({ onOpenCommandPalette }: { onOpenCommandPalette: () => void }) {
  const appMetaQuery = useQuery({
    ...appMetaQueryOptions(),
    retry: false
  });

  if (appMetaQuery.isPending) {
    return (
      <header className="sticky top-0 z-20 border-b border-border bg-surface/95 px-6 py-3 backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <SearchButton onOpenCommandPalette={onOpenCommandPalette} />
          <div className="flex items-center justify-end gap-2 font-[family-name:var(--font-jetbrains)] text-xs text-fg-muted">
            <span className="rounded-md border border-border/80 bg-bg/40 px-2 py-1">loading runtime</span>
          </div>
        </div>
      </header>
    );
  }

  if (appMetaQuery.isError || !appMetaQuery.data) {
    return (
      <header className="sticky top-0 z-20 border-b border-border bg-surface/95 px-6 py-3 backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <SearchButton onOpenCommandPalette={onOpenCommandPalette} />
          <div className="flex items-center justify-end gap-2 font-[family-name:var(--font-jetbrains)] text-xs text-amber-200">
            <span className="rounded-md border border-amber-500/25 bg-amber-500/10 px-2 py-1">
              runtime metadata unavailable
            </span>
          </div>
        </div>
      </header>
    );
  }

  const { data } = appMetaQuery;
  const showUpdateChip = data.updateStatus === 'behind' && data.updateBehind != null;
  const showInstallChip = data.installStatus !== 'ready';

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-surface/95 px-6 py-3 backdrop-blur">
      <div className="flex items-center justify-between gap-3">
        <SearchButton onOpenCommandPalette={onOpenCommandPalette} />
        <div className="flex items-center justify-end gap-2 font-[family-name:var(--font-jetbrains)] text-[11px]">
          <div className="max-w-[15rem] rounded-xl border border-border/55 bg-white/[0.03] px-2.5 py-1.5 text-fg-faint">
            <span className="truncate">{data.rootPath}</span>
          </div>
          <span className={['inline-flex items-center rounded-xl border px-2.5 py-1.5', gatewayClass(data.gatewayState)].join(' ')}>
            gateway {data.gatewayState}
          </span>
          {data.connectedPlatforms.map((platform) => (
            <span
              key={platform}
              className="inline-flex items-center rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1.5 text-emerald-200"
            >
              {platform}
            </span>
          ))}
          {showUpdateChip ? (
            <span className="inline-flex items-center rounded-xl border border-amber-500/25 bg-amber-500/10 px-2.5 py-1.5 text-amber-200">
              {data.updateBehind} behind
            </span>
          ) : null}
          {showInstallChip ? (
            <span className={['inline-flex items-center rounded-xl border px-2.5 py-1.5', installClass(data.installStatus)].join(' ')}>
              install {data.installStatus}
            </span>
          ) : null}
        </div>
      </div>
    </header>
  );
}
