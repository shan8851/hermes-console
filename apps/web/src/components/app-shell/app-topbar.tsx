import { useQuery } from '@tanstack/react-query';
import { Menu, Search } from 'lucide-react';

import { ProfileScopeSelector } from '@/features/profile-scope/profile-scope-selector';
import { appMetaQueryOptions } from '@/lib/api';

import type { ProfileScopeId } from '@/features/profile-scope/profile-scope';

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
      className="inline-flex min-w-0 shrink-0 items-center gap-2 rounded-xl border border-border/70 bg-surface/65 px-3 py-2.5 text-sm text-fg-muted outline-none transition-colors hover:border-accent/35 hover:text-fg focus:border-accent/50"
    >
      <Search className="h-4 w-4 shrink-0" />
      <span className="truncate">Search</span>
      <span className="hidden rounded-md bg-white/5 px-2 py-1 font-mono text-[11px] uppercase tracking-[0.16em] text-fg-faint sm:inline">
        Cmd/Ctrl+K
      </span>
      <span className="hidden rounded-md bg-white/5 px-2 py-1 font-mono text-[11px] uppercase tracking-[0.16em] text-fg-faint sm:inline">
        /
      </span>
    </button>
  );
}

function MobileMenuButton({ onOpenSidebar }: { onOpenSidebar: () => void }) {
  return (
    <button
      type="button"
      aria-label="Open navigation menu"
      onClick={onOpenSidebar}
      className="inline-flex items-center justify-center rounded-md border border-border/80 bg-bg/40 p-2 text-fg-muted transition-colors hover:border-accent/35 hover:text-fg xl:hidden"
    >
      <Menu className="h-4 w-4" />
    </button>
  );
}

function RuntimeChips({
  rootPath,
  gatewayState,
  connectedPlatforms,
  installStatus,
  updateBehind,
  updateStatus
}: {
  rootPath: string;
  gatewayState: string;
  connectedPlatforms: string[];
  installStatus: string;
  updateBehind: number | null;
  updateStatus: string;
}) {
  const showUpdateChip = updateStatus === 'behind' && updateBehind != null;
  const showInstallChip = installStatus !== 'ready';

  return (
    <div className="flex flex-wrap items-center gap-2 font-[family-name:var(--font-jetbrains)] text-[11px] xl:flex-nowrap xl:overflow-x-auto">
      <div className="max-w-full rounded-xl border border-border/55 bg-white/[0.03] px-2.5 py-1.5 text-fg-faint sm:max-w-[20rem]">
        <span className="truncate">{rootPath}</span>
      </div>
      <span
        className={['inline-flex items-center rounded-xl border px-2.5 py-1.5', gatewayClass(gatewayState)].join(' ')}
      >
        gateway {gatewayState}
      </span>
      {connectedPlatforms.map((platform) => (
        <span
          key={platform}
          className="inline-flex items-center rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1.5 text-emerald-200"
        >
          {platform}
        </span>
      ))}
      {showUpdateChip ? (
        <span className="inline-flex items-center rounded-xl border border-amber-500/25 bg-amber-500/10 px-2.5 py-1.5 text-amber-200">
          {updateBehind} behind
        </span>
      ) : null}
      {showInstallChip ? (
        <span
          className={['inline-flex items-center rounded-xl border px-2.5 py-1.5', installClass(installStatus)].join(
            ' '
          )}
        >
          install {installStatus}
        </span>
      ) : null}
    </div>
  );
}

export function AppTopbar({
  fallbackProfileScope,
  onFallbackProfileScopeChange,
  onOpenCommandPalette,
  onOpenSidebar
}: {
  fallbackProfileScope: ProfileScopeId;
  onFallbackProfileScopeChange: (scope: ProfileScopeId) => void;
  onOpenCommandPalette: () => void;
  onOpenSidebar: () => void;
}) {
  const appMetaQuery = useQuery({
    ...appMetaQueryOptions(),
    retry: false
  });

  if (appMetaQuery.isPending) {
    return (
      <header className="sticky top-0 z-20 border-b border-border bg-surface/95 px-4 py-3 backdrop-blur lg:px-6">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 flex-col gap-3 xl:flex-row xl:items-center">
            <div className="flex items-center gap-3">
              <MobileMenuButton onOpenSidebar={onOpenSidebar} />
              <p className="font-[family-name:var(--font-bricolage)] text-sm font-semibold tracking-tight text-accent xl:hidden">
                Hermes Console
              </p>
            </div>
            <div className="flex items-center justify-start gap-2 font-[family-name:var(--font-jetbrains)] text-xs text-fg-muted">
              <span className="rounded-md border border-border/80 bg-bg/40 px-2 py-1">loading runtime</span>
            </div>
          </div>
          <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
            <SearchButton onOpenCommandPalette={onOpenCommandPalette} />
            <ProfileScopeSelector
              fallbackProfileScope={fallbackProfileScope}
              onFallbackProfileScopeChange={onFallbackProfileScopeChange}
            />
          </div>
        </div>
      </header>
    );
  }

  if (appMetaQuery.isError || !appMetaQuery.data) {
    return (
      <header className="sticky top-0 z-20 border-b border-border bg-surface/95 px-4 py-3 backdrop-blur lg:px-6">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 flex-col gap-3 xl:flex-row xl:items-center">
            <div className="flex items-center gap-3">
              <MobileMenuButton onOpenSidebar={onOpenSidebar} />
              <p className="font-[family-name:var(--font-bricolage)] text-sm font-semibold tracking-tight text-accent xl:hidden">
                Hermes Console
              </p>
            </div>
            <div className="flex items-center justify-start gap-2 font-[family-name:var(--font-jetbrains)] text-xs text-amber-200">
              <span className="rounded-md border border-amber-500/25 bg-amber-500/10 px-2 py-1">
                runtime metadata unavailable
              </span>
            </div>
          </div>
          <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
            <SearchButton onOpenCommandPalette={onOpenCommandPalette} />
            <ProfileScopeSelector
              fallbackProfileScope={fallbackProfileScope}
              onFallbackProfileScopeChange={onFallbackProfileScopeChange}
            />
          </div>
        </div>
      </header>
    );
  }

  const { data } = appMetaQuery;

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-surface/95 px-4 py-3 backdrop-blur lg:px-6">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 flex-col gap-3 xl:flex-row xl:items-center">
          <div className="flex items-center gap-3">
            <MobileMenuButton onOpenSidebar={onOpenSidebar} />
            <p className="font-[family-name:var(--font-bricolage)] text-sm font-semibold tracking-tight text-accent xl:hidden">
              Hermes Console
            </p>
          </div>
          <RuntimeChips
            rootPath={data.rootPath}
            gatewayState={data.gatewayState}
            connectedPlatforms={data.connectedPlatforms}
            installStatus={data.installStatus}
            updateBehind={data.updateBehind}
            updateStatus={data.updateStatus}
          />
        </div>
        <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
          <SearchButton onOpenCommandPalette={onOpenCommandPalette} />
          <ProfileScopeSelector
            fallbackProfileScope={fallbackProfileScope}
            onFallbackProfileScopeChange={onFallbackProfileScopeChange}
          />
        </div>
      </div>
    </header>
  );
}
