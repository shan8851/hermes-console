import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { OverviewRuntimeInstall } from '@/features/runtime-overview/components/overview-runtime-install';
import type { RuntimeOverviewSummary } from '@hermes-console/runtime';

const overview: RuntimeOverviewSummary = {
  capturedAt: '2026-04-12T08:57:29.000Z',
  verdict: {
    status: 'needs_attention',
    label: 'Needs attention',
    summary: 'The runtime is behind upstream.'
  },
  warnings: [],
  runtimeHealth: [],
  platforms: [],
  access: {
    authProviders: [],
    apiKeys: []
  },
  runtimeProfile: [],
  activity: {
    sessionCount: 0,
    cronAttentionJobs: 0,
    overdueCronJobs: 0,
    contentfulCronJobs: 0,
    memoryPressure: 'healthy'
  },
  installStatus: 'ready',
  availableAgentCount: 2,
  totalAgentCount: 2,
  gatewayState: 'running',
  gatewayUpdatedAt: '2026-04-11T21:57:53.000Z',
  connectedPlatforms: ['discord', 'telegram'],
  configuredPlatforms: ['discord', 'telegram'],
  configuredPlatformCount: 2,
  updateBehind: 55,
  updateStatus: 'behind',
  doctorIssueCount: 0
};

const renderOverviewRuntimeInstall = (): void => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false
      }
    }
  });

  render(
    <QueryClientProvider client={queryClient}>
      <OverviewRuntimeInstall overview={overview} />
    </QueryClientProvider>
  );
};

describe('OverviewRuntimeInstall', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders the Hermes CLI version instead of the console package version', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              rootPath: '/home/shan/.hermes',
              rootKind: 'env_override',
              installStatus: 'ready',
              gatewayState: 'running',
              updateCheckedAt: '2026-04-12T08:57:29.000Z',
              updateStatus: 'behind',
              updateBehind: 55,
              hermesVersion: 'v0.8.0',
              hermesBuildDate: '2026.4.8',
              version: '0.3.0',
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

    renderOverviewRuntimeInstall();

    await waitFor(() => {
      expect(screen.getByText('v0.8.0')).toBeTruthy();
    });

    expect(screen.getByText(/Build 2026\.4\.8\. 55 commits behind\./)).toBeTruthy();
    expect(screen.queryByText('0.3.0')).toBeNull();
  });
});
