import { describe, expect, it } from 'vitest';

import { composeRuntimeOverview } from './compose-runtime-overview.js';

const createBaseInput = () => ({
  installation: {
    status: 'ready' as const,
    availableAgentCount: 2,
    agents: [{ id: 'default' }, { id: 'discord' }]
  },
  gateway: {
    state: 'running' as const,
    updatedAt: '2026-04-07T09:30:00.000Z',
    connectedPlatforms: ['discord'],
    platformStates: {
      discord: 'connected',
      slack: 'disconnected'
    }
  },
  channels: {
    updatedAt: '2026-04-07T09:25:00.000Z',
    connectedPlatforms: ['discord'],
    totalConfiguredEntries: 3,
    platforms: {
      discord: { total: 2, threads: 1 },
      slack: { total: 1, threads: 0 }
    }
  },
  update: {
    checkedAt: '2026-04-07T09:20:00.000Z',
    behind: 3,
    status: 'behind' as const
  },
  config: {
    model: 'gpt-5.4',
    provider: 'openai',
    webBackend: 'exa',
    terminalBackend: 'local',
    ttsProvider: 'elevenlabs',
    sttProvider: 'openai',
    approvalsMode: 'manual',
    compressionEnabled: true,
    redactSecrets: true,
    tirithEnabled: true,
    discordRequireMention: true,
    discordAutoThread: false,
    configuredPlatforms: ['discord', 'slack']
  },
  memory: {
    files: {
      memory: { pressureLevel: 'near_limit' as const },
      user: { pressureLevel: 'healthy' as const }
    }
  },
  sessions: {
    sessions: [{ id: 'session-1' }, { id: 'session-2' }]
  },
  cron: {
    jobs: [
      {
        statusTone: 'warning',
        latestOutputState: 'contentful',
        attentionLevel: 'warning',
        overdue: true,
        failureStreak: 2
      },
      {
        statusTone: 'healthy',
        latestOutputState: 'quiet',
        attentionLevel: 'healthy',
        overdue: false,
        failureStreak: 0
      }
    ]
  },
  status: {
    capturedAt: '2026-04-07T09:15:00.000Z',
    apiKeys: [],
    authProviders: [
      {
        name: 'GitHub',
        state: 'logged_in' as const,
        symbol: 'ok' as const,
        detail: 'Authenticated'
      }
    ],
    apiKeyProviders: [],
    messagingPlatforms: [
      {
        name: 'Discord',
        state: 'configured' as const,
        symbol: 'ok' as const,
        detail: 'Messaging configured'
      },
      {
        name: 'Slack',
        state: 'configured' as const,
        symbol: 'ok' as const,
        detail: 'Slack token saved'
      }
    ],
    gatewayStatus: null,
    scheduledJobs: {
      active: 1,
      total: 2
    },
    sessions: {
      active: 1
    }
  },
  doctor: {
    capturedAt: '2026-04-07T09:10:00.000Z',
    issueCount: 2,
    issues: ['Outdated plugin', 'Security vulnerability detected'],
    toolWarnings: [],
    authProviders: []
  },
  envEntries: new Map<string, string>([
    ['OPENAI_API_KEY', 'openai-key'],
    ['EXA_API_KEY', 'exa-key'],
    ['ELEVENLABS_API_KEY', 'elevenlabs-key'],
    ['GITHUB_TOKEN', 'github-token']
  ])
});

describe('composeRuntimeOverview', () => {
  it('composes warnings, platform summaries, access checks, and activity counts', () => {
    const overview = composeRuntimeOverview(createBaseInput());

    expect(overview.capturedAt).toBe('2026-04-07T09:10:00.000Z');
    expect(overview.verdict).toMatchObject({
      status: 'needs_attention',
      label: 'Needs attention'
    });
    expect(overview.warnings).toEqual([
      expect.objectContaining({
        id: 'update-behind',
        tone: 'warning',
        title: 'Hermes is 3 commits behind tracked upstream'
      }),
      expect.objectContaining({
        id: 'doctor-0',
        tone: 'info',
        title: 'Outdated plugin'
      }),
      expect.objectContaining({
        id: 'doctor-1',
        tone: 'warning',
        title: 'Security vulnerability detected'
      }),
      expect.objectContaining({
        id: 'memory-pressure',
        tone: 'warning'
      }),
      expect.objectContaining({
        id: 'cron-attention',
        tone: 'warning',
        detail: '1 overdue · 1 on a failure streak'
      })
    ]);
    expect(overview.attentionItems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'runtime:update-behind',
          severity: 'warning',
          domain: 'runtime'
        }),
        expect.objectContaining({
          id: 'memory:pressure',
          severity: 'warning',
          domain: 'memory'
        }),
        expect.objectContaining({
          id: expect.stringMatching(/^cron:/),
          severity: 'warning',
          domain: 'cron'
        })
      ])
    );
    expect(overview.platforms).toEqual([
      expect.objectContaining({
        name: 'Discord',
        configured: true,
        live: true,
        detail: 'Messaging configured · 2 routed channels · gateway connected',
        defaults: ['mention required', 'auto-thread disabled']
      }),
      expect.objectContaining({
        name: 'Slack',
        configured: true,
        live: false,
        detail: 'Slack token saved · 1 routed channel · gateway disconnected',
        defaults: []
      })
    ]);
    expect(overview.access.authProviders).toEqual([
      {
        name: 'GitHub',
        status: 'available',
        detail: 'Authenticated'
      }
    ]);
    expect(overview.access.apiKeys).toEqual([
      expect.objectContaining({
        name: 'Model access',
        status: 'available'
      }),
      expect.objectContaining({
        name: 'Voice access',
        status: 'available'
      }),
      expect.objectContaining({
        name: 'Search backend',
        status: 'available'
      }),
      expect.objectContaining({
        name: 'Browser cloud',
        status: 'missing'
      }),
      expect.objectContaining({
        name: 'GitHub',
        status: 'available'
      })
    ]);
    expect(overview.runtimeProfile).toEqual([
      {
        label: 'model',
        value: 'gpt-5.4',
        detail: 'openai'
      },
      {
        label: 'search',
        value: 'exa',
        detail: 'Search credentials detected'
      },
      {
        label: 'voice output',
        value: 'elevenlabs available',
        detail: ''
      },
      {
        label: 'voice input',
        value: 'openai available',
        detail: ''
      },
      {
        label: 'approvals',
        value: 'manual',
        detail: 'Compression enabled'
      },
      {
        label: 'security',
        value: 'tirith on',
        detail: 'Redact secrets on'
      }
    ]);
    expect(overview.activity).toEqual({
      sessionCount: 2,
      cronAttentionJobs: 1,
      overdueCronJobs: 1,
      contentfulCronJobs: 1,
      memoryPressure: 'near_limit'
    });
    expect(overview.connectedPlatforms).toEqual(['discord']);
    expect(overview.configuredPlatforms).toEqual(['discord', 'slack']);
    expect(overview.configuredPlatformCount).toBe(2);
  });

  it('falls back to status-derived configured platforms when config is empty', () => {
    const overview = composeRuntimeOverview({
      ...createBaseInput(),
      channels: {
        updatedAt: '2026-04-07T09:25:00.000Z',
        connectedPlatforms: [],
        totalConfiguredEntries: 0,
        platforms: {
          discord: { total: 0, threads: 0 }
        }
      },
      config: {
        ...createBaseInput().config,
        configuredPlatforms: []
      },
      status: {
        ...createBaseInput().status,
        messagingPlatforms: [
          {
            name: 'Discord',
            state: 'configured',
            symbol: 'ok',
            detail: 'Discord ready'
          },
          {
            name: 'Telegram',
            state: 'not_configured',
            symbol: 'error',
            detail: 'No token'
          }
        ]
      },
      gateway: {
        state: 'running',
        updatedAt: '2026-04-07T09:30:00.000Z',
        connectedPlatforms: ['slack'],
        platformStates: {
          slack: 'connected'
        }
      }
    });

    expect(overview.connectedPlatforms).toEqual(['slack']);
    expect(overview.configuredPlatforms).toEqual(['discord']);
    expect(overview.configuredPlatformCount).toBe(1);
    expect(overview.platforms.map((platform) => platform.name)).toEqual(['Discord', 'Slack', 'Telegram']);
    expect(overview.platforms).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'Slack',
          configured: false,
          live: true
        }),
        expect.objectContaining({
          name: 'Telegram',
          configured: false,
          live: null,
          detail: 'No token'
        })
      ])
    );
  });

  it('degrades cleanly when optional snapshots are unavailable', () => {
    const overview = composeRuntimeOverview({
      installation: {
        status: 'partial',
        availableAgentCount: 0,
        agents: []
      },
      gateway: {
        state: 'stopped',
        updatedAt: null,
        connectedPlatforms: [],
        platformStates: {}
      },
      channels: {
        updatedAt: null,
        connectedPlatforms: [],
        totalConfiguredEntries: 0,
        platforms: {}
      },
      update: {
        checkedAt: null,
        behind: null,
        status: 'unknown'
      },
      config: {
        model: null,
        provider: null,
        webBackend: null,
        terminalBackend: null,
        ttsProvider: null,
        sttProvider: null,
        approvalsMode: null,
        compressionEnabled: null,
        redactSecrets: null,
        tirithEnabled: null,
        discordRequireMention: null,
        discordAutoThread: null,
        configuredPlatforms: []
      },
      memory: {
        files: {
          memory: { pressureLevel: 'healthy' },
          user: { pressureLevel: 'healthy' }
        }
      },
      sessions: {
        sessions: []
      },
      cron: {
        jobs: []
      }
    });

    expect(overview.capturedAt).toBeNull();
    expect(overview.verdict).toMatchObject({
      status: 'broken',
      label: 'Broken'
    });
    expect(overview.warnings).toEqual([
      expect.objectContaining({
        id: 'gateway-state',
        tone: 'critical'
      })
    ]);
    expect(overview.attentionItems).toEqual([
      expect.objectContaining({
        id: 'gateway:state',
        severity: 'critical',
        domain: 'gateway'
      })
    ]);
    expect(overview.platforms).toEqual([]);
    expect(overview.access.authProviders).toEqual([]);
    expect(overview.access.apiKeys.map((entry) => entry.status)).toEqual([
      'missing',
      'missing',
      'missing',
      'missing',
      'missing'
    ]);
    expect(overview.runtimeProfile).toEqual([
      {
        label: 'model',
        value: 'unknown',
        detail: 'provider unknown'
      },
      {
        label: 'search',
        value: 'unknown',
        detail: 'No search-provider credentials detected'
      },
      {
        label: 'voice output',
        value: 'unknown',
        detail: ''
      },
      {
        label: 'voice input',
        value: 'unknown',
        detail: ''
      },
      {
        label: 'approvals',
        value: 'unknown',
        detail: 'Compression unknown'
      },
      {
        label: 'security',
        value: 'unknown',
        detail: 'Secret redaction unknown'
      }
    ]);
    expect(overview.activity).toEqual({
      sessionCount: 0,
      cronAttentionJobs: 0,
      overdueCronJobs: 0,
      contentfulCronJobs: 0,
      memoryPressure: 'healthy'
    });
  });
});
