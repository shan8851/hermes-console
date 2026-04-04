"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { appRoutes } from "@/lib/navigation";

function isRouteActive(pathname: string, href: string) {
  if (href === "/") {
    return pathname === href;
  }

  return pathname.startsWith(href);
}

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full min-h-0 flex-col border-r border-white/6 bg-[rgba(8,17,31,0.82)] px-4 py-5 backdrop-blur xl:sticky xl:top-0 xl:h-screen">
      <div className="mb-6 px-2">
        <p className="text-xs font-medium uppercase tracking-[0.22em] text-[var(--color-accent)]">
          Hermes Console
        </p>
        <p className="mt-2 max-w-[14rem] text-sm leading-6 text-[var(--color-muted)]">
          Calm local visibility for sessions, cron, skills, memory, setup, and
          key files.
        </p>
      </div>

      <nav aria-label="Primary" className="flex flex-col gap-2">
        {appRoutes.map((route) => {
          const active = isRouteActive(pathname, route.href);

          return (
            <Link
              key={route.href}
              href={route.href}
              className={[
                "rounded-2xl border px-3 py-3 transition-colors",
                active
                  ? "border-[var(--color-border-strong)] bg-[var(--color-accent-soft)] text-white shadow-lg shadow-black/10"
                  : "border-transparent bg-transparent text-slate-300 hover:border-white/8 hover:bg-white/4 hover:text-white",
              ].join(" ")}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium">{route.label}</span>
                <span
                  className={[
                    "h-2 w-2 rounded-full",
                    active ? "bg-[var(--color-accent)]" : "bg-white/12",
                  ].join(" ")}
                />
              </div>
              <p className="mt-1 text-xs leading-5 text-[var(--color-muted)]">
                {route.description}
              </p>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto rounded-2xl border border-white/6 bg-black/10 px-4 py-4">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--color-accent)]">
          v1 posture
        </p>
        <p className="mt-2 text-xs leading-5 text-[var(--color-muted)]">
          Read-mostly, local-first, and intentionally light on chrome.
        </p>
      </div>
    </aside>
  );
}
