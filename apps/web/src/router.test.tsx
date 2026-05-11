import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryHistory } from '@tanstack/react-router';
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AppRouterProvider, createAppRouter } from '@/router';

const isoTimestamp = '2026-04-06T12:00:00.000Z';

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
      label: 'MEMORY.md',
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
      label: 'USER.md',
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

const keyFileSummary = {
  id: 'agents-md',
  path: '/tmp/hermes/AGENTS.md',
  name: 'AGENTS.md',
  scope: 'hermes_root' as const,
  relativePath: 'AGENTS.md',
  kind: 'instruction' as const,
  fileSize: 18,
  lastModifiedMs: 1
};

const skillLinkedFile = {
  id: 'guide-md',
  kind: 'reference' as const,
  relativePath: 'guide.md',
  absolutePath: '/tmp/hermes/skills/demo-skill/guide.md'
};

const nestedSkillLinkedFile = {
  id: 'references/guide.md',
  kind: 'reference' as const,
  relativePath: 'references/guide.md',
  absolutePath: '/tmp/hermes/skills/workspace/demo-skill/references/guide.md'
};

const skillSummary = {
  id: 'demo-skill',
  slug: 'demo-skill',
  name: 'Demo Skill',
  description: 'Demo description',
  category: 'workspace',
  skillPath: '/tmp/hermes/skills/demo-skill/SKILL.md',
  parseStatus: 'valid' as const,
  linkedFiles: [skillLinkedFile]
};

const nestedSkillSummary = {
  id: 'workspace/demo-skill',
  slug: 'demo-skill',
  name: 'Nested Demo Skill',
  description: 'Nested demo description',
  category: 'workspace',
  skillPath: '/tmp/hermes/skills/workspace/demo-skill/SKILL.md',
  parseStatus: 'valid' as const,
  linkedFiles: [nestedSkillLinkedFile]
};

const appMeta = {
  rootPath: '/tmp/hermes',
  rootKind: 'default' as const,
  installStatus: 'ready' as const,
  gatewayState: 'running' as const,
  updateCheckedAt: isoTimestamp,
  updateStatus: 'up_to_date' as const,
  updateBehind: 0,
  version: '0.3.0',
  connectedPlatforms: ['discord'],
  connectedPlatformCount: 1
};

const inventory = {
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
    },
    {
      id: 'nigel',
      label: 'nigel',
      rootPath: '/tmp/hermes/profiles/nigel',
      source: 'profile',
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
  availableAgentCount: 2,
  status: 'ready'
};

const legacyUsageSummary = {
  loadedAt: isoTimestamp,
  windows: [
    {
      id: '1d' as const,
      label: 'Last 1 day',
      days: 1,
      sessionCount: 1,
      inputTokens: 120,
      outputTokens: 30,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      reasoningTokens: 10,
      totalTokens: 160,
      estimatedCostUsd: 1.25,
      topModel: {
        key: 'gpt-5',
        label: 'gpt-5',
        sessions: 1,
        inputTokens: 120,
        outputTokens: 30,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
        reasoningTokens: 10,
        totalTokens: 160,
        estimatedCostUsd: 1.25
      },
      topAgent: {
        key: 'default',
        label: 'Default',
        sessions: 1,
        inputTokens: 120,
        outputTokens: 30,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
        reasoningTokens: 10,
        totalTokens: 160,
        estimatedCostUsd: 1.25
      },
      byModel: [
        {
          key: 'gpt-5',
          label: 'gpt-5',
          sessions: 1,
          inputTokens: 120,
          outputTokens: 30,
          cacheReadTokens: 0,
          cacheWriteTokens: 0,
          reasoningTokens: 10,
          totalTokens: 160,
          estimatedCostUsd: 1.25
        }
      ],
      byAgent: [
        {
          key: 'default',
          label: 'Default',
          sessions: 1,
          inputTokens: 120,
          outputTokens: 30,
          cacheReadTokens: 0,
          cacheWriteTokens: 0,
          reasoningTokens: 10,
          totalTokens: 160,
          estimatedCostUsd: 1.25
        }
      ]
    },
    {
      id: '7d' as const,
      label: 'Last 7 days',
      days: 7,
      sessionCount: 1,
      inputTokens: 120,
      outputTokens: 30,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      reasoningTokens: 10,
      totalTokens: 160,
      estimatedCostUsd: 1.25,
      topModel: {
        key: 'gpt-5',
        label: 'gpt-5',
        sessions: 1,
        inputTokens: 120,
        outputTokens: 30,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
        reasoningTokens: 10,
        totalTokens: 160,
        estimatedCostUsd: 1.25
      },
      topAgent: {
        key: 'default',
        label: 'Default',
        sessions: 1,
        inputTokens: 120,
        outputTokens: 30,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
        reasoningTokens: 10,
        totalTokens: 160,
        estimatedCostUsd: 1.25
      },
      byModel: [
        {
          key: 'gpt-5',
          label: 'gpt-5',
          sessions: 1,
          inputTokens: 120,
          outputTokens: 30,
          cacheReadTokens: 0,
          cacheWriteTokens: 0,
          reasoningTokens: 10,
          totalTokens: 160,
          estimatedCostUsd: 1.25
        }
      ],
      byAgent: [
        {
          key: 'default',
          label: 'Default',
          sessions: 1,
          inputTokens: 120,
          outputTokens: 30,
          cacheReadTokens: 0,
          cacheWriteTokens: 0,
          reasoningTokens: 10,
          totalTokens: 160,
          estimatedCostUsd: 1.25
        }
      ]
    },
    {
      id: '30d' as const,
      label: 'Last 30 days',
      days: 30,
      sessionCount: 1,
      inputTokens: 120,
      outputTokens: 30,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      reasoningTokens: 10,
      totalTokens: 160,
      estimatedCostUsd: 1.25,
      topModel: {
        key: 'gpt-5',
        label: 'gpt-5',
        sessions: 1,
        inputTokens: 120,
        outputTokens: 30,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
        reasoningTokens: 10,
        totalTokens: 160,
        estimatedCostUsd: 1.25
      },
      topAgent: {
        key: 'default',
        label: 'Default',
        sessions: 1,
        inputTokens: 120,
        outputTokens: 30,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
        reasoningTokens: 10,
        totalTokens: 160,
        estimatedCostUsd: 1.25
      },
      byModel: [
        {
          key: 'gpt-5',
          label: 'gpt-5',
          sessions: 1,
          inputTokens: 120,
          outputTokens: 30,
          cacheReadTokens: 0,
          cacheWriteTokens: 0,
          reasoningTokens: 10,
          totalTokens: 160,
          estimatedCostUsd: 1.25
        }
      ],
      byAgent: [
        {
          key: 'default',
          label: 'Default',
          sessions: 1,
          inputTokens: 120,
          outputTokens: 30,
          cacheReadTokens: 0,
          cacheWriteTokens: 0,
          reasoningTokens: 10,
          totalTokens: 160,
          estimatedCostUsd: 1.25
        }
      ]
    }
  ],
  availableWindows: ['1d', '7d', '30d'] as const
};

const createSessionSummary = ({
  agentId,
  agentLabel,
  title
}: {
  agentId: string;
  agentLabel: string;
  title: string;
}) => ({
  id: `${agentId}:session-1`,
  agentId,
  agentLabel,
  agentSource: agentId === 'default' ? ('root' as const) : ('profile' as const),
  agentRootPath: agentId === 'default' ? '/tmp/hermes' : `/tmp/hermes/profiles/${agentId}`,
  sessionId: `${agentId}-session-1`,
  sessionKey: null,
  source: 'cli',
  sourceLabel: 'cli',
  title,
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
});

const createCronJobSummary = ({
  agentId,
  agentLabel,
  attentionLevel = 'healthy',
  latestOutputState = 'missing',
  name,
  overdue = false
}: {
  agentId: string;
  agentLabel: string;
  attentionLevel?: 'healthy' | 'warning' | 'critical' | 'muted';
  latestOutputState?: 'silent' | 'contentful' | 'missing';
  name: string;
  overdue?: boolean;
}) => ({
  id: `${agentId}:job-1`,
  jobId: `${agentId}-job-1`,
  summaryId: `${agentId}:job-1`,
  name,
  agentId,
  agentLabel,
  agentRootPath: agentId === 'default' ? '/tmp/hermes' : `/tmp/hermes/profiles/${agentId}`,
  enabled: true,
  state: 'scheduled',
  scheduleDisplay: 'every hour',
  scheduleKind: 'interval' as const,
  scheduleExpression: '1h',
  model: null,
  provider: null,
  baseUrl: null,
  scriptPath: null,
  noAgent: false,
  contextFrom: [],
  enabledToolsets: [],
  workdir: null,
  createdAt: isoTimestamp,
  nextRunAt: isoTimestamp,
  lastRunAt: isoTimestamp,
  pausedAt: null,
  pausedReason: null,
  lastStatus: null,
  lastError: null,
  lastDeliveryError: null,
  deliver: 'local',
  prompt: 'Test job',
  skills: [],
  skill: null,
  repeatCompleted: null,
  repeatTimes: null,
  originChatName: null,
  statusTone:
    attentionLevel === 'critical'
      ? ('error' as const)
      : attentionLevel === 'warning'
        ? ('warning' as const)
        : ('healthy' as const),
  attentionLevel,
  overdue,
  failureStreak: attentionLevel === 'healthy' ? 0 : 1,
  recentObservedRunCount: 1,
  recentSuccessCount: attentionLevel === 'healthy' ? 1 : 0,
  recentFailureCount: attentionLevel === 'healthy' ? 0 : 1,
  recentSuccessRate: attentionLevel === 'healthy' ? 1 : 0,
  observedRunCount: 1,
  lastSuccessfulRunAt: attentionLevel === 'healthy' ? isoTimestamp : null,
  lastFailedRunAt: attentionLevel === 'healthy' ? null : isoTimestamp,
  latestDurationMs: 1000,
  averageDurationMs: 1000,
  latestOutputState,
  recentOutputCount: latestOutputState === 'contentful' ? 1 : 0,
  upcomingRuns: []
});

const createMemoryIndex = () => ({
  agents: [
    {
      ...createMemoryReadResult(),
      agentId: 'default',
      agentLabel: 'Default',
      agentSource: 'root' as const
    },
    {
      ...createMemoryReadResult(),
      agentId: 'nigel',
      agentLabel: 'nigel',
      agentSource: 'profile' as const,
      files: {
        ...createMemoryReadResult().files,
        memory: {
          ...createMemoryReadResult().files.memory,
          pressureLevel: 'near_limit' as const
        }
      }
    }
  ],
  agentCount: 2,
  agentsWithMemory: 2
});

const overviewSummary = {
  capturedAt: isoTimestamp,
  verdict: {
    status: 'solid' as const,
    label: 'Solid',
    summary: 'Hermes is readable.'
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
    sessionCount: 2,
    cronAttentionJobs: 0,
    overdueCronJobs: 0,
    contentfulCronJobs: 0,
    memoryPressure: 'healthy' as const
  },
  installStatus: 'ready' as const,
  availableAgentCount: 2,
  totalAgentCount: 2,
  gatewayState: 'running' as const,
  gatewayUpdatedAt: isoTimestamp,
  connectedPlatforms: [],
  configuredPlatforms: [],
  configuredPlatformCount: 0,
  updateBehind: 0,
  updateStatus: 'up_to_date' as const,
  doctorIssueCount: 0
};

const diagnosticsResponse = {
  data: {
    status: {
      capturedAt: isoTimestamp,
      apiKeys: [],
      authProviders: [],
      apiKeyProviders: [],
      messagingPlatforms: [],
      gatewayStatus: null,
      scheduledJobs: {
        active: 0,
        total: 0
      },
      sessions: {
        active: 0
      }
    },
    doctor: {
      capturedAt: isoTimestamp,
      issueCount: 0,
      issues: [],
      toolWarnings: [],
      authProviders: []
    }
  },
  issues: [],
  meta: {
    capturedAt: isoTimestamp,
    dataStatus: 'ready' as const
  }
};

const createFetchStub = (
  responses: Record<
    string,
    {
      body: unknown;
      status?: number;
    }
  >
) =>
  vi.fn(async (input: RequestInfo | URL) => {
    const rawUrl = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    const url = new URL(rawUrl, 'http://localhost');
    const path = `${url.pathname}${url.search}`;
    const response =
      responses[path] ??
      (path === '/api/inventory'
        ? {
            body: createSnapshotEnvelope(inventory)
          }
        : undefined);

    if (!response) {
      throw new Error(`Unexpected fetch for ${path}`);
    }

    return new Response(JSON.stringify(response.body), {
      headers: {
        'Content-Type': 'application/json'
      },
      status: response.status ?? 200
    });
  });

const renderRoute = async ({
  initialEntry,
  responses
}: {
  initialEntry: string;
  responses: Parameters<typeof createFetchStub>[0];
}) => {
  vi.stubGlobal('fetch', createFetchStub(responses));
  vi.stubGlobal('scrollTo', vi.fn());

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        retry: false,
        staleTime: 60_000
      }
    }
  });
  const router = createAppRouter({
    history: createMemoryHistory({
      initialEntries: [initialEntry]
    }),
    queryClient
  });

  await router.load();

  render(
    <QueryClientProvider client={queryClient}>
      <AppRouterProvider router={router} />
    </QueryClientProvider>
  );
};

describe('selected preview routes', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('loads a deep-linked file preview before the files page renders', async () => {
    await renderRoute({
      initialEntry: '/files?file=agents-md',
      responses: {
        '/api/meta/app': {
          body: appMeta
        },
        '/api/files': {
          body: createSnapshotEnvelope({
            keyFiles: {
              roots: {
                hermesRoot: '/tmp/hermes',
                workspaceRoot: '/tmp/workspace'
              },
              files: [keyFileSummary]
            },
            memory: createMemoryReadResult()
          })
        },
        '/api/files/agents-md': {
          body: createSnapshotEnvelope({
            file: keyFileSummary,
            content: 'Alpha instructions'
          })
        }
      }
    });

    expect(await screen.findByText('Key Files')).toBeTruthy();
    expect(screen.getByText('Alpha instructions')).toBeTruthy();
    expect(screen.queryByText('Loading the selected file preview.')).toBeNull();
    expect(screen.queryByText('This view could not be loaded')).toBeNull();
  });

  it('keeps an invalid file deep link as an inline preview error', async () => {
    await renderRoute({
      initialEntry: '/files?file=missing',
      responses: {
        '/api/meta/app': {
          body: appMeta
        },
        '/api/files': {
          body: createSnapshotEnvelope({
            keyFiles: {
              roots: {
                hermesRoot: '/tmp/hermes',
                workspaceRoot: '/tmp/workspace'
              },
              files: [keyFileSummary]
            },
            memory: createMemoryReadResult()
          })
        },
        '/api/files/missing': {
          body: {
            error: 'File not found for missing'
          },
          status: 404
        }
      }
    });

    expect(await screen.findByText('Key Files')).toBeTruthy();
    expect(await screen.findByText('File not found for missing')).toBeTruthy();
    expect(screen.queryByText('This view could not be loaded')).toBeNull();
  });

  it('loads a deep-linked skill file preview before the skill page renders', async () => {
    await renderRoute({
      initialEntry: '/skills/demo-skill?file=guide-md',
      responses: {
        '/api/meta/app': {
          body: appMeta
        },
        '/api/skills/demo-skill': {
          body: createSnapshotEnvelope({
            summary: skillSummary,
            rawContent: 'Skill body',
            body: 'Skill body',
            frontmatter: {}
          })
        },
        '/api/skills/demo-skill/files/guide-md': {
          body: createSnapshotEnvelope({
            file: skillLinkedFile,
            content: 'Guide body'
          })
        }
      }
    });

    expect(await screen.findByRole('heading', { name: 'Demo Skill' })).toBeTruthy();
    expect(await screen.findByText('Guide body')).toBeTruthy();
    expect(screen.queryByText('Loading linked file preview.')).toBeNull();
    expect(screen.queryByText('This view could not be loaded')).toBeNull();
  });

  it('keeps an invalid skill file deep link as an inline preview error', async () => {
    await renderRoute({
      initialEntry: '/skills/demo-skill?file=missing-file',
      responses: {
        '/api/meta/app': {
          body: appMeta
        },
        '/api/skills/demo-skill': {
          body: createSnapshotEnvelope({
            summary: skillSummary,
            rawContent: 'Skill body',
            body: 'Skill body',
            frontmatter: {}
          })
        },
        '/api/skills/demo-skill/files/missing-file': {
          body: {
            error: 'Linked skill file not found for demo-skill/missing-file'
          },
          status: 404
        }
      }
    });

    expect(await screen.findByRole('heading', { name: 'Demo Skill' })).toBeTruthy();
    expect(await screen.findByText('Linked skill file not found for demo-skill/missing-file')).toBeTruthy();
    expect(screen.queryByText('This view could not be loaded')).toBeNull();
  });

  it('loads nested skill ids without double-encoding the route params', async () => {
    await renderRoute({
      initialEntry: '/skills/workspace%2Fdemo-skill?file=references%2Fguide.md',
      responses: {
        '/api/meta/app': {
          body: appMeta
        },
        '/api/skills/workspace%2Fdemo-skill': {
          body: createSnapshotEnvelope({
            summary: nestedSkillSummary,
            rawContent: 'Nested skill body',
            body: 'Nested skill body',
            frontmatter: {}
          })
        },
        '/api/skills/workspace%2Fdemo-skill/files/references%2Fguide.md': {
          body: createSnapshotEnvelope({
            file: nestedSkillLinkedFile,
            content: 'Nested guide body'
          })
        }
      }
    });

    expect(await screen.findByRole('heading', { name: 'Nested Demo Skill' })).toBeTruthy();
    expect(await screen.findByText('Nested guide body')).toBeTruthy();
    expect(screen.queryByText('This view could not be loaded')).toBeNull();
  });

  it('maps the legacy sessions agent query to the profile scope', async () => {
    await renderRoute({
      initialEntry: '/sessions?agent=nigel',
      responses: {
        '/api/meta/app': {
          body: appMeta
        },
        '/api/sessions': {
          body: createSnapshotEnvelope({
            sessions: [
              createSessionSummary({
                agentId: 'default',
                agentLabel: 'Default',
                title: 'Default session'
              }),
              createSessionSummary({
                agentId: 'nigel',
                agentLabel: 'nigel',
                title: 'Nigel session'
              })
            ],
            agentCount: 2,
            agentsWithSessions: 2
          })
        }
      }
    });

    expect(await screen.findByText('Session History')).toBeTruthy();
    expect(screen.getByText('Nigel session')).toBeTruthy();
    expect(screen.queryByText('Default session')).toBeNull();
  });

  it('falls back calmly when a sessions profile query is unknown', async () => {
    await renderRoute({
      initialEntry: '/sessions?profile=missing',
      responses: {
        '/api/meta/app': {
          body: appMeta
        },
        '/api/sessions': {
          body: createSnapshotEnvelope({
            sessions: [
              createSessionSummary({
                agentId: 'default',
                agentLabel: 'Default',
                title: 'Default session'
              }),
              createSessionSummary({
                agentId: 'nigel',
                agentLabel: 'nigel',
                title: 'Nigel session'
              })
            ],
            agentCount: 2,
            agentsWithSessions: 2
          })
        }
      }
    });

    expect(await screen.findByText('Session History')).toBeTruthy();
    expect(screen.getByText('Default session')).toBeTruthy();
    expect(screen.getByText('Nigel session')).toBeTruthy();
  });

  it('scopes overview activity cards while leaving runtime cards global when a profile scope is selected', async () => {
    await renderRoute({
      initialEntry: '/?profile=nigel',
      responses: {
        '/api/meta/app': {
          body: appMeta
        },
        '/api/runtime/overview': {
          body: createSnapshotEnvelope(overviewSummary)
        },
        '/api/runtime/diagnostics': {
          body: diagnosticsResponse
        },
        '/api/sessions': {
          body: createSnapshotEnvelope({
            sessions: [
              createSessionSummary({
                agentId: 'default',
                agentLabel: 'Default',
                title: 'Default session'
              }),
              createSessionSummary({
                agentId: 'nigel',
                agentLabel: 'nigel',
                title: 'Nigel session'
              })
            ],
            agentCount: 2,
            agentsWithSessions: 2
          })
        },
        '/api/cron': {
          body: createSnapshotEnvelope({
            jobs: [
              createCronJobSummary({
                agentId: 'default',
                agentLabel: 'Default',
                attentionLevel: 'warning',
                latestOutputState: 'contentful',
                name: 'Default cron',
                overdue: true
              }),
              createCronJobSummary({
                agentId: 'nigel',
                agentLabel: 'nigel',
                attentionLevel: 'critical',
                latestOutputState: 'contentful',
                name: 'Nigel cron',
                overdue: false
              })
            ],
            agentCount: 2,
            agentsWithCron: 2
          })
        },
        '/api/memory': {
          body: createSnapshotEnvelope(createMemoryIndex())
        }
      }
    });

    expect(await screen.findByText('Profile: nigel')).toBeTruthy();
    expect(screen.getByText(/Activity cards and profile-aware sections are scoped to nigel/)).toBeTruthy();
    expect(screen.getByText(/Runtime, gateway, update, and diagnostics cards remain global/)).toBeTruthy();

    const sessionsCard = screen
      .getAllByText('sessions')
      .map((element) => element.closest('article'))
      .find(Boolean);
    expect(sessionsCard).toBeTruthy();
    expect(within(sessionsCard as HTMLElement).getByText('1')).toBeTruthy();

    const memoryCard = screen.getByText('memory pressure').closest('article');
    expect(memoryCard).toBeTruthy();
    expect(within(memoryCard as HTMLElement).getByText('near limit')).toBeTruthy();
  });

  it('loads the memory page from the legacy single-agent payload shape', async () => {
    await renderRoute({
      initialEntry: '/memory',
      responses: {
        '/api/meta/app': {
          body: appMeta
        },
        '/api/inventory': {
          body: createSnapshotEnvelope({
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
              },
              {
                id: 'nigel',
                label: 'nigel',
                rootPath: '/tmp/hermes/profiles/nigel',
                source: 'profile',
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
            availableAgentCount: 2,
            status: 'ready'
          })
        },
        '/api/memory': {
          body: createSnapshotEnvelope(createMemoryReadResult())
        }
      }
    });

    expect(await screen.findByText('Saved Memory')).toBeTruthy();
    expect(await screen.findByText('/tmp/hermes/memories/MEMORY.md')).toBeTruthy();
    expect(screen.queryByText('This view could not be loaded')).toBeNull();
  });

  it('loads the usage page from the legacy summary payload shape', async () => {
    await renderRoute({
      initialEntry: '/usage',
      responses: {
        '/api/meta/app': {
          body: appMeta
        },
        '/api/usage': {
          body: createSnapshotEnvelope(legacyUsageSummary)
        }
      }
    });

    expect(await screen.findByText('Token usage and estimated cost')).toBeTruthy();
    expect(await screen.findAllByText('gpt-5')).toHaveLength(2);
    expect(screen.queryByText('This view could not be loaded')).toBeNull();
  });
});
