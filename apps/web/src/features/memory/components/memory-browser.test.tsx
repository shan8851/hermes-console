import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { MemoryBrowser } from '@/features/memory/components/memory-browser';
import type { AgentMemoryReadResult, MemoryFileSummary } from '@hermes-console/runtime';

const createMemoryFile = ({
  exists = true,
  lastModifiedMs = 1_775_343_300_000,
  pressureLevel = 'healthy',
  scope
}: {
  exists?: boolean;
  lastModifiedMs?: number | null;
  pressureLevel?: MemoryFileSummary['pressureLevel'];
  scope: MemoryFileSummary['scope'];
}): MemoryFileSummary => ({
  scope,
  label: scope === 'memory' ? 'MEMORY' : 'USER',
  filePath: `/tmp/hermes/memories/${scope === 'memory' ? 'MEMORY' : 'USER'}.md`,
  exists,
  lastModifiedMs,
  rawContent: exists ? `${scope} raw local/private content` : '',
  preamble: '',
  entries: exists
    ? [
        {
          id: `${scope}-1`,
          charCount: 12,
          content: `${scope} block`
        }
      ]
    : [],
  charCount: exists ? 12 : 0,
  limit: 100,
  usageRatio: exists ? 0.12 : 0,
  usagePercentage: exists ? 12 : 0,
  pressureLevel
});

const createAgent = (): AgentMemoryReadResult => ({
  agentId: 'default',
  agentLabel: 'Default',
  agentSource: 'root',
  configPath: '/tmp/hermes/config.yaml',
  rootPath: '/tmp/hermes',
  status: 'ready',
  limits: {
    memory: {
      source: 'default',
      value: 100
    },
    user: {
      source: 'default',
      value: 100
    }
  },
  files: {
    memory: createMemoryFile({ scope: 'memory' }),
    user: createMemoryFile({ scope: 'user' })
  },
  provider: {
    kind: 'external',
    name: 'honcho',
    status: 'setup_needed',
    description: 'Honcho AI-native cross-session user modeling.',
    configuredProvider: 'honcho',
    requirements: [
      {
        envVar: 'HONCHO_API_KEY',
        required: true,
        status: 'missing'
      }
    ]
  },
  statusSummary: {
    level: 'healthy',
    label: 'Healthy',
    detail: 'Built-in memory files are present and within their configured character limits.',
    latestModifiedMs: 1_775_343_300_000,
    staleAfterDays: 90
  }
});

function renderMemoryBrowser() {
  const queryClient = new QueryClient();

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryBrowser
        loadedAt="2026-05-12T12:00:00.000Z"
        memory={{
          agentCount: 1,
          agents: [createAgent()],
          agentsWithMemory: 1
        }}
        profileScope="all"
        refreshQueryKeys={[['memory']]}
      />
    </QueryClientProvider>
  );
}

describe('MemoryBrowser', () => {
  afterEach(() => cleanup());

  it('shows provider setup status and local/private memory copy', () => {
    renderMemoryBrowser();

    expect(screen.getByText('provider setup needed')).toBeTruthy();
    expect(screen.getByText('HONCHO_API_KEY: missing')).toBeTruthy();
    expect(screen.getAllByText(/Local\/private raw memory/).length).toBeGreaterThan(0);
    expect(screen.getByText('Stale after 90 days without a built-in memory file change.')).toBeTruthy();
  });
});
