import { useQuery } from '@tanstack/react-query';
import { Link, useRouterState } from '@tanstack/react-router';
import { ExternalLink, Github } from 'lucide-react';

import { appMetaQueryOptions } from '@/lib/api';
import { appRoutes } from '@/lib/navigation';

const isRouteActive = (pathname: string, href: string): boolean =>
  href === '/' ? pathname === href : pathname.startsWith(href);

export function AppSidebar() {
  const pathname = useRouterState({
    select: (state) => state.location.pathname
  });
  const appMetaQuery = useQuery({
    ...appMetaQueryOptions(),
    retry: false
  });
  const fallbackVersion = typeof globalThis.__APP_VERSION__ === 'string' ? globalThis.__APP_VERSION__ : undefined;
  const versionLabel = `v${appMetaQuery.data?.version ?? fallbackVersion ?? '—'}`;

  return (
    <aside className="flex h-full min-h-0 flex-col border-r border-border bg-surface/80 px-3 py-5 xl:sticky xl:top-0 xl:h-screen">
      <div>
        <div className="mb-5 px-3">
          <p className="font-[family-name:var(--font-bricolage)] text-sm font-semibold tracking-tight text-accent">
            Hermes Console
          </p>
        </div>

        <nav aria-label="Primary" className="flex flex-col gap-0.5">
          {appRoutes.map((route) => {
            const active = isRouteActive(pathname, route.href);
            const Icon = route.icon;

            return (
              <Link
                key={route.href}
                to={route.href}
                className={[
                  'relative flex items-start gap-3 rounded-md px-3 py-2 transition-colors',
                  active ? 'border-l-2 border-accent bg-accent/10' : 'border-l-2 border-transparent hover:bg-white/5'
                ].join(' ')}
              >
                <Icon className={['mt-0.5 h-4 w-4 shrink-0', active ? 'text-accent' : 'text-fg-muted'].join(' ')} />
                <div className="min-w-0">
                  <p className={['text-sm', active ? 'font-medium text-fg-strong' : 'text-fg-muted'].join(' ')}>
                    {route.label}
                  </p>
                  <p className="text-[11px] leading-4 text-fg-faint">{route.description}</p>
                </div>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="mt-auto border-t border-border/60 px-3 pt-4">
        <a
          href="https://github.com/shan8851/hermes-console"
          target="_blank"
          rel="noreferrer"
          aria-label="Hermes Console on GitHub"
          className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm text-fg-muted transition-colors hover:bg-white/5 hover:text-fg"
        >
          <span className="inline-flex items-center gap-2">
            <Github className="h-4 w-4" />
            GitHub
          </span>
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
        <div className="mt-3 flex items-center justify-between px-1">
          <span className="font-[family-name:var(--font-bricolage)] text-xs font-medium tracking-tight text-fg-strong">
            Version
          </span>
          <span className="rounded-sm bg-[#2a1a05] px-2 py-1 font-[family-name:var(--font-jetbrains)] text-[11px] text-amber-300">
            {versionLabel}
          </span>
        </div>
      </div>
    </aside>
  );
}
