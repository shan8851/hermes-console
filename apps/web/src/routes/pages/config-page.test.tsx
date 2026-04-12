import { Suspense } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ConfigPage } from '@/routes/pages/config-page';

import type { HermesConfigFile, HermesQueryIssue, HermesQueryStatus } from '@hermes-console/runtime';

const isoTimestamp = '2026-04-12T23:00:00.000Z';

const createConfigEnvelope = ({
  files,
  issues,
  status
}: {
  files: HermesConfigFile[];
  issues: HermesQueryIssue[];
  status: HermesQueryStatus;
}) => ({
  data: {
    files
  },
  issues,
  meta: {
    capturedAt: isoTimestamp,
    dataStatus: status
  }
});

const renderConfigPage = ({
  files,
  issues,
  status
}: {
  files: HermesConfigFile[];
  issues: HermesQueryIssue[];
  status: HermesQueryStatus;
}) => {
  vi.stubGlobal(
    'fetch',
    vi.fn(
      async () =>
        new Response(JSON.stringify(createConfigEnvelope({ files, issues, status })), {
          status: 200,
          headers: {
            'Content-Type': 'application/json'
          }
        })
    )
  );

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false
      }
    }
  });

  render(
    <QueryClientProvider client={queryClient}>
      <Suspense fallback={<div>Loading</div>}>
        <ConfigPage />
      </Suspense>
    </QueryClientProvider>
  );
};

describe('ConfigPage', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('shows a missing-config state when the selected agent has no config.yaml', async () => {
    renderConfigPage({
      files: [
        {
          agentId: 'default',
          agentLabel: 'Default',
          agentSource: 'root',
          path: '/tmp/hermes/config.yaml',
          content: 'model:\n  default: gpt-5.4\n',
          readStatus: 'ready',
          readDetail: null
        },
        {
          agentId: 'alpha',
          agentLabel: 'alpha',
          agentSource: 'profile',
          path: '/tmp/hermes/profiles/alpha/config.yaml',
          content: null,
          readStatus: 'missing',
          readDetail: null
        }
      ],
      issues: [
        {
          id: 'config-missing:alpha',
          code: 'missing_path',
          severity: 'warning',
          summary: 'alpha config is missing',
          detail: 'Hermes Console did not find config.yaml under this agent root.',
          path: '/tmp/hermes/profiles/alpha/config.yaml'
        }
      ],
      status: 'partial'
    });

    expect(await screen.findByText('Configuration')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /alpha/ }));

    await waitFor(() => {
      expect(screen.getByText('config.yaml not found')).toBeTruthy();
    });

    expect(screen.getByText('Config read quality')).toBeTruthy();
    expect(screen.getByText('alpha config is missing')).toBeTruthy();
  });

  it('shows unreadable file details when config.yaml cannot be read', async () => {
    renderConfigPage({
      files: [
        {
          agentId: 'alpha',
          agentLabel: 'alpha',
          agentSource: 'profile',
          path: '/tmp/hermes/profiles/alpha/config.yaml',
          content: null,
          readStatus: 'unreadable',
          readDetail: 'EISDIR: illegal operation on a directory, read'
        }
      ],
      issues: [
        {
          id: 'config-unreadable:alpha',
          code: 'unreadable_path',
          severity: 'warning',
          summary: 'alpha config is unreadable',
          detail: 'EISDIR: illegal operation on a directory, read',
          path: '/tmp/hermes/profiles/alpha/config.yaml'
        }
      ],
      status: 'missing'
    });

    expect(await screen.findByText('config.yaml could not be read')).toBeTruthy();
    expect(screen.getAllByText('EISDIR: illegal operation on a directory, read')).toHaveLength(2);
    expect(screen.getByText('Missing data')).toBeTruthy();
  });
});
