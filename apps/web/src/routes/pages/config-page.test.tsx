import { Suspense } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ConfigPage } from '@/routes/pages/config-page';
import { ALL_PROFILES_SCOPE, type ProfileScopeId } from '@/features/profile-scope/profile-scope';

import type { HermesConfigFile, HermesQueryIssue, HermesQueryStatus } from '@hermes-console/runtime';

const isoTimestamp = '2026-04-12T23:00:00.000Z';

const createInventoryEnvelope = ({
  agents = [
    {
      id: 'default',
      label: 'Default',
      rootPath: '/tmp/hermes',
      source: 'root' as const,
      presence: {
        config: true,
        cron: true,
        memory: true,
        sessions: true,
        skills: true,
        stateDb: true
      },
      isAvailable: true
    },
    {
      id: 'alpha',
      label: 'alpha',
      rootPath: '/tmp/hermes/profiles/alpha',
      source: 'profile' as const,
      presence: {
        config: true,
        cron: true,
        memory: true,
        sessions: true,
        skills: true,
        stateDb: true
      },
      isAvailable: true
    }
  ]
} = {}) => ({
  data: {
    paths: {
      hermesRoot: {
        label: 'hermes_root',
        path: '/tmp/hermes',
        kind: 'default',
        envKey: 'HERMES_CONSOLE_HERMES_DIR'
      },
      workspaceRoot: {
        label: 'workspace_root',
        path: '/tmp/workspace',
        kind: 'default',
        envKey: 'HERMES_CONSOLE_WORKSPACE_DIR'
      }
    },
    hermesRootExists: true,
    profilesRootPath: '/tmp/hermes/profiles',
    profilesRootExists: true,
    agents,
    availableAgentCount: agents.filter((agent) => agent.isAvailable).length,
    status: 'ready'
  },
  issues: [],
  meta: {
    capturedAt: isoTimestamp,
    dataStatus: 'ready' as const
  }
});

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
  agents,
  files,
  issues,
  profileScope = ALL_PROFILES_SCOPE,
  status
}: {
  agents?: ReturnType<typeof createInventoryEnvelope>['data']['agents'];
  files: HermesConfigFile[];
  issues: HermesQueryIssue[];
  profileScope?: ProfileScopeId;
  status: HermesQueryStatus;
}) => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const rawUrl = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      const url = new URL(rawUrl, 'http://localhost');
      const body =
        url.pathname === '/api/inventory'
          ? createInventoryEnvelope({ agents })
          : createConfigEnvelope({ files, issues, status });

      return new Response(JSON.stringify(body), {
        status: 200,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    })
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
        <ConfigPage profileScope={profileScope} />
      </Suspense>
    </QueryClientProvider>
  );
};

describe('ConfigPage', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('does not fall back to all configs when a known selected profile has no config payload row', async () => {
    renderConfigPage({
      profileScope: 'alpha',
      files: [
        {
          agentId: 'default',
          agentLabel: 'Default',
          agentSource: 'root',
          path: '/tmp/hermes/config.yaml',
          content: 'model:\n  default: gpt-5.4\n',
          readStatus: 'ready',
          readDetail: null
        }
      ],
      issues: [],
      status: 'ready'
    });

    expect(await screen.findByText('No config files found for the active profile scope.')).toBeTruthy();
    expect(screen.queryByText('/tmp/hermes/config.yaml')).toBeNull();
    expect(screen.queryByText('model:')).toBeNull();
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
