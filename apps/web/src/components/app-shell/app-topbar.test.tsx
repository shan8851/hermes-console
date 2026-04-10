import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AppTopbar } from '@/components/app-shell/app-topbar';

const renderTopbar = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false
      }
    }
  });

  render(
      <QueryClientProvider client={queryClient}>
        <AppTopbar onOpenCommandPalette={vi.fn()} />
      </QueryClientProvider>
  );
};

describe('AppTopbar', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              error: 'app meta unavailable'
            }),
            {
              status: 500,
              headers: {
                'Content-Type': 'application/json'
              }
            }
          )
      )
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders a non-blocking fallback when app meta cannot be loaded', async () => {
    renderTopbar();

    await waitFor(() => {
      expect(screen.getByText('runtime metadata unavailable')).toBeTruthy();
    });
  });

  it('hides low-signal chips and keeps only actionable topbar status', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              rootPath: '/home/test/.hermes',
              rootKind: 'env_override',
              installStatus: 'ready',
              gatewayState: 'running',
              updateStatus: 'unknown',
              updateBehind: null,
              connectedPlatforms: ['discord', 'telegram'],
              connectedPlatformCount: 2
            }),
            {
              status: 200,
              headers: {
                'Content-Type': 'application/json'
              }
            }
          )
      )
    );

    renderTopbar();

    await waitFor(() => {
      expect(screen.getByText('/home/test/.hermes')).toBeTruthy();
    });

    expect(screen.queryByText('custom root')).toBeNull();
    expect(screen.queryByText('default root')).toBeNull();
    expect(screen.queryByText('update unknown')).toBeNull();
    expect(screen.queryByText('up to date')).toBeNull();
    expect(screen.queryByText('install ready')).toBeNull();
    expect(screen.getByText('gateway running')).toBeTruthy();
    expect(screen.getByText('discord')).toBeTruthy();
    expect(screen.getByText('telegram')).toBeTruthy();
  });
});
