"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { appRoutes } from "@/lib/navigation";

const isRouteActive = (pathname: string, href: string): boolean =>
  href === "/" ? pathname === href : pathname.startsWith(href);

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full min-h-0 flex-col border-r border-border bg-surface/80 px-3 py-5 xl:sticky xl:top-0 xl:h-screen">
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
              href={route.href}
              className={[
                "relative flex items-start gap-3 rounded-md px-3 py-2 transition-colors",
                active
                  ? "border-l-2 border-accent bg-accent/10"
                  : "border-l-2 border-transparent hover:bg-white/5",
              ].join(" ")}
            >
              <Icon className={["mt-0.5 h-4 w-4 shrink-0", active ? "text-accent" : "text-fg-muted"].join(" ")} />
              <div className="min-w-0">
                <p className={["text-sm", active ? "font-medium text-fg-strong" : "text-fg-muted"].join(" ")}>
                  {route.label}
                </p>
                <p className="text-[11px] leading-4 text-fg-faint">{route.description}</p>
              </div>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
