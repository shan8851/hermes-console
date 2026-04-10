import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AppCommandPalette } from '@/components/app-shell/app-command-palette';

const { navigateMock } = vi.hoisted(() => ({
  navigateMock: vi.fn()
}));

vi.mock('@tanstack/react-router', async () => {
  const actual = await vi.importActual<typeof import('@tanstack/react-router')>('@tanstack/react-router');

  return {
    ...actual,
    useRouter: () => ({
      navigate: navigateMock
    })
  };
});

const isoTimestamp = '2026-04-10T12:00:00.000Z';

const createSnapshotEnvelope = <T,>(data: T) => ({
  data,
  issues: [],
  meta: {
    capturedAt: isoTimestamp,
    dataStatus: 'ready' as const
  }
});

const createMemoryReadResult = () => ({
  status: 'ready' as const,
  rootPath: '/tmp/hermes',
  configPath: '/tmp/hermes/config.yaml',
  limits: {
    memory: {
      source: 'default' as const,
      value: 2200
    },
    user: {
      source: 'default' as const,
      value: 1375
    }
  },
  files: {
    memory: {
      scope: 'memory' as const,
      label: 'MEMORY',
      filePath: '/tmp/hermes/memories/MEMORY.md',
      exists: true,
      rawContent: 'Memory body',
      preamble: '',
      entries: [],
      charCount: 11,
      limit: 2200,
      usageRatio: 0.005,
      usagePercentage: 1,
      pressureLevel: 'healthy' as const
    },
    user: {
      scope: 'user' as const,
      label: 'USER',
      filePath: '/tmp/hermes/memories/USER.md',
      exists: true,
      rawContent: 'User body',
      preamble: '',
      entries: [],
      charCount: 9,
      limit: 1375,
      usageRatio: 0.0065,
      usagePercentage: 1,
      pressureLevel: 'healthy' as const
    }
  }
});

const createFetchStub = () =>
  vi.fn(async (input: RequestInfo | URL) => {
    const rawUrl = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    const url = new URL(rawUrl, 'http://localhost');

    const responses: Record<string, unknown> = {
      '/api/inventory': createSnapshotEnvelope({
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
        agents: [
          {
            id: 'default',
            label: 'Default',
            rootPath: '/tmp/hermes',
            source: 'root',
            presence: {
              config: true,
              memory: true,
              sessions: true,
              cron: true,
              skills: true,
              stateDb: true
            },
            isAvailable: true
          }
        ],
        availableAgentCount: 1,
        status: 'ready'
      }),
      '/api/sessions': createSnapshotEnvelope({
        sessions: [
          {
            id: 'default:session-1',
            agentId: 'default',
            agentLabel: 'Default',
            agentSource: 'root',
            agentRootPath: '/tmp/hermes',
            sessionId: 'session-1',
            sessionKey: null,
            source: 'cli',
            sourceLabel: 'cli',
            title: 'Debug session',
            displayName: null,
            platform: null,
            chatType: null,
            model: 'gpt-5',
            startedAt: isoTimestamp,
            endedAt: isoTimestamp,
            lastActivityAt: isoTimestamp,
            messageCount: 4,
            toolCallCount: 1,
            totalTokens: 100,
            estimatedCostUsd: 1,
            costStatus: 'estimated',
            memoryFlushed: false,
            hasStateTranscript: true,
            hasMessagingMetadata: false,
            cronJobId: null,
            cronJobName: null
          }
        ],
        agentCount: 1,
        agentsWithSessions: 1
      }),
      '/api/cron': createSnapshotEnvelope({
        jobs: [
          {
            summaryId: 'default:job-1',
            id: 'job-1',
            jobId: 'job-1',
            name: 'Morning sync',
            agentId: 'default',
            agentLabel: 'Default',
            agentRootPath: '/tmp/hermes',
            enabled: true,
            state: 'scheduled',
            scheduleDisplay: '0 8 * * *',
            createdAt: isoTimestamp,
            nextRunAt: isoTimestamp,
            lastRunAt: isoTimestamp,
            lastStatus: 'ok',
            lastError: null,
            deliver: '#ops',
            prompt: 'Run sync',
            skills: [],
            skill: null,
            scheduleKind: 'cron',
            repeatCompleted: null,
            originChatName: null,
            statusTone: 'healthy',
            attentionLevel: 'healthy',
            overdue: false,
            failureStreak: 0,
            recentFailureCount: 0,
            observedRunCount: 1,
            latestDurationMs: 10,
            averageDurationMs: 10,
            latestOutputState: 'contentful',
            recentOutputCount: 1
          }
        ],
        agentCount: 1,
        agentsWithCron: 1
      }),
      '/api/skills': createSnapshotEnvelope({
        skillsRoot: '/tmp/hermes/skills',
        skills: [
          {
            id: 'demo-skill',
            slug: 'demo-skill',
            name: 'Demo Skill',
            description: 'A demo skill',
            category: 'workspace',
            skillPath: '/tmp/hermes/skills/demo-skill/SKILL.md',
            parseStatus: 'valid',
            linkedFiles: []
          }
        ]
      }),
      '/api/files': createSnapshotEnvelope({
        keyFiles: {
          roots: {
            hermesRoot: '/tmp/hermes',
            workspaceRoot: '/tmp/workspace'
          },
          files: [
            {
              id: 'agents-md',
              path: '/tmp/hermes/AGENTS.md',
              name: 'AGENTS.md',
              scope: 'hermes_root',
              relativePath: 'AGENTS.md',
              kind: 'instruction',
              fileSize: 18,
              lastModifiedMs: 1
            }
          ]
        },
        memory: createMemoryReadResult()
      })
    };

    return new Response(JSON.stringify(responses[url.pathname]), {
      headers: {
        'Content-Type': 'application/json'
      }
    });
  });

const PaletteHarness = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <input aria-label="Outside input" />
      <AppCommandPalette isOpen={isOpen} onClose={() => setIsOpen(false)} onOpen={() => setIsOpen(true)} />
    </>
  );
};

const renderPalette = () => {
  vi.stubGlobal('fetch', createFetchStub());

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false
      }
    }
  });

  render(
    <QueryClientProvider client={queryClient}>
      <PaletteHarness />
    </QueryClientProvider>
  );
};

describe('AppCommandPalette', () => {
  const scrollIntoViewMock = vi.fn();

  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
    configurable: true,
    value: scrollIntoViewMock
  });

  afterEach(() => {
    cleanup();
    navigateMock.mockReset();
    scrollIntoViewMock.mockReset();
    vi.unstubAllGlobals();
  });

  it('opens from the keyboard shortcut and renders grouped results', async () => {
    renderPalette();

    fireEvent.keyDown(window, {
      key: 'k',
      ctrlKey: true
    });

    expect(
      await screen.findByPlaceholderText('Search routes, agents, sessions, cron jobs, skills, and files')
    ).toBeTruthy();
    expect(await screen.findByText('Overview')).toBeTruthy();
    expect(await screen.findByText('Debug session')).toBeTruthy();
  });

  it('ignores the slash shortcut while focus is inside an input', () => {
    renderPalette();

    const input = screen.getByLabelText('Outside input');
    input.focus();
    fireEvent.keyDown(input, {
      key: '/'
    });

    expect(screen.queryByPlaceholderText('Search routes, agents, sessions, cron jobs, skills, and files')).toBeNull();
  });

  it('keeps the active search result scrolled into view while navigating with arrow keys', async () => {
    renderPalette();

    fireEvent.keyDown(window, {
      key: 'k',
      ctrlKey: true
    });

    const paletteInput = await screen.findByPlaceholderText(
      'Search routes, agents, sessions, cron jobs, skills, and files'
    );
    scrollIntoViewMock.mockReset();

    fireEvent.keyDown(paletteInput, {
      key: 'ArrowDown'
    });

    await waitFor(() => {
      expect(scrollIntoViewMock).toHaveBeenCalled();
    });
  });
});
