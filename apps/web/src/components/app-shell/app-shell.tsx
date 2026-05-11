import { useState } from 'react';
import type { ReactNode } from 'react';

import { AppCommandPalette } from '@/components/app-shell/app-command-palette';
import { AppSidebar } from '@/components/app-shell/app-sidebar';
import { AppTopbar } from '@/components/app-shell/app-topbar';
import { ALL_PROFILES_SCOPE, type ProfileScopeId } from '@/features/profile-scope/profile-scope';

export function AppShell({ children }: { children: ReactNode }) {
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [fallbackProfileScope, setFallbackProfileScope] = useState<ProfileScopeId>(ALL_PROFILES_SCOPE);

  return (
    <div className="min-h-screen bg-bg text-fg xl:grid xl:grid-cols-[14rem_minmax(0,1fr)]">
      <div className="hidden xl:block">
        <AppSidebar />
      </div>
      <div className="min-w-0">
        <AppTopbar
          fallbackProfileScope={fallbackProfileScope}
          onFallbackProfileScopeChange={setFallbackProfileScope}
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
          onOpenSidebar={() => setIsSidebarOpen(true)}
        />
        <main className="mx-auto flex w-full max-w-[112rem] flex-col gap-5 px-4 py-4 lg:px-6 lg:py-5 xl:px-8">
          {children}
        </main>
        <footer className="mx-auto mt-8 w-full max-w-[112rem] border-t border-border/40 px-4 py-6 text-xs text-fg-faint lg:px-6 xl:px-8">
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

      {isSidebarOpen ? (
        <div className="fixed inset-0 z-40 xl:hidden">
          <button
            type="button"
            aria-label="Close navigation menu"
            onClick={() => setIsSidebarOpen(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <div className="relative z-10 h-full max-w-[18rem]">
            <AppSidebar
              mode="drawer"
              onNavigate={() => setIsSidebarOpen(false)}
              onRequestClose={() => setIsSidebarOpen(false)}
            />
          </div>
        </div>
      ) : null}

      <AppCommandPalette
        fallbackProfileScope={fallbackProfileScope}
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onFallbackProfileScopeChange={setFallbackProfileScope}
        onOpen={() => setIsCommandPaletteOpen(true)}
      />
    </div>
  );
}
