import { useState } from 'react';
import type { ReactNode } from 'react';

import { AppCommandPalette } from '@/components/app-shell/app-command-palette';
import { AppSidebar } from '@/components/app-shell/app-sidebar';
import { AppTopbar } from '@/components/app-shell/app-topbar';

export function AppShell({ children }: { children: ReactNode }) {
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  return (
    <div className="min-h-screen bg-bg text-fg xl:grid xl:grid-cols-[14rem_minmax(0,1fr)]">
      <AppSidebar />
      <div className="min-w-0">
        <AppTopbar onOpenCommandPalette={() => setIsCommandPaletteOpen(true)} />
        <main className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-4 lg:px-6 lg:py-5">{children}</main>
        <footer className="mx-auto mt-8 w-full max-w-6xl border-t border-border/40 px-4 py-6 text-xs text-fg-faint lg:px-6">
          Built by{' '}
          <a
            href="https://shan8851.com"
            target="_blank"
            rel="noreferrer"
            className="text-fg-muted underline decoration-border underline-offset-4 transition-colors hover:text-fg"
          >
            Shan
          </a>
        </footer>
      </div>
      <AppCommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onOpen={() => setIsCommandPaletteOpen(true)}
      />
    </div>
  );
}
