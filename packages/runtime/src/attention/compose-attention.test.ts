import { describe, expect, it } from 'vitest';

import type { DoctorSnapshotSummary, GatewaySummary, UpdateStatusSummary } from '../runtime-overview/types.js';
import { composeAttentionItems } from './compose-attention.js';

const healthyGateway: GatewaySummary = {
  state: 'running',
  updatedAt: '2026-04-07T09:30:00.000Z',
  connectedPlatforms: [],
  platformStates: {}
};

const cleanDoctor: DoctorSnapshotSummary = {
  capturedAt: '2026-04-07T09:10:00.000Z',
  issueCount: 0,
  issues: [],
  toolWarnings: [],
  authProviders: []
};

const cleanUpdate: UpdateStatusSummary = {
  checkedAt: '2026-04-07T09:20:00.000Z',
  behind: 0,
  status: 'up_to_date'
};

const compose = (input: Partial<Parameters<typeof composeAttentionItems>[0]> = {}) =>
  composeAttentionItems({
    doctor: cleanDoctor,
    gateway: healthyGateway,
    memoryPressure: 'healthy',
    update: cleanUpdate,
    ...input
  });

describe('composeAttentionItems', () => {
  it('prioritizes critical gateway, cron, logs, memory, config, and skills signals', () => {
    const items = compose({
      gateway: {
        ...healthyGateway,
        state: 'stopped'
      },
      cronJobs: [
        {
          summaryId: 'default:nightly',
          jobId: 'nightly',
          name: 'Nightly brief',
          agentId: 'default',
          agentLabel: 'Default',
          attentionLevel: 'critical',
          overdue: true,
          failureStreak: 2,
          lastStatus: 'error',
          lastError: 'Traceback details that should be bounded',
          lastDeliveryError: null
        }
      ],
      logs: [
        {
          id: 'errors.log',
          name: 'errors.log',
          path: '/tmp/hermes/logs/errors.log',
          fileSize: 120,
          lastModifiedMs: 1,
          analyzedLineCount: 20,
          errorLineCount: 3,
          warningLineCount: 1,
          infoLineCount: 0,
          debugLineCount: 0
        }
      ],
      memoryPressure: 'near_limit',
      configFiles: [
        {
          agentId: 'default',
          agentLabel: 'Default',
          path: '/tmp/hermes/config.yaml',
          readStatus: 'unreadable',
          readDetail: 'EACCES'
        }
      ],
      skills: [
        {
          id: 'bad-skill',
          slug: 'bad-skill',
          name: 'Bad Skill',
          description: 'No frontmatter',
          category: 'workspace',
          tags: [],
          profileId: 'default',
          source: {
            agentId: 'default',
            kind: 'root',
            label: 'Default',
            rootPath: '/tmp/hermes/skills'
          },
          skillPath: 'bad-skill/SKILL.md',
          parseStatus: 'malformed',
          readiness: {
            status: 'parse_issue',
            reasons: ['SKILL.md frontmatter is missing required name or description metadata.'],
            platform: {
              currentPlatform: 'linux',
              platforms: [],
              status: 'compatible'
            },
            requirements: [],
            linkedFileCount: 0,
            linkedFilesByKind: {
              asset: 0,
              reference: 0,
              script: 0,
              template: 0
            }
          },
          linkedFiles: []
        }
      ]
    });

    expect(items.map((item) => item.id)).toEqual([
      'gateway:state',
      'cron:default:nightly',
      'logs:tail-errors',
      'config:unreadable:default',
      'memory:pressure',
      'skills:malformed'
    ]);
    expect(items[0]).toMatchObject({
      severity: 'critical',
      domain: 'gateway'
    });
    expect(items.find((item) => item.id === 'cron:default:nightly')).toMatchObject({
      href: '/cron/default/nightly',
      profileId: 'default',
      profileLabel: 'Default',
      summary: expect.stringContaining('overdue')
    });
  });

  it('omits optional missing query issues from primary attention', () => {
    const items = compose({
      queryIssues: [
        {
          id: 'runtime-update-cache-missing',
          code: 'missing_path',
          severity: 'info',
          summary: 'Update cache not found',
          detail: 'Update drift is unknown.',
          path: '/tmp/hermes/.update_check'
        },
        {
          id: 'runtime-config-missing',
          code: 'missing_path',
          severity: 'warning',
          summary: 'config.yaml not found',
          detail: 'Runtime defaults are partially unknown.',
          path: '/tmp/hermes/config.yaml'
        }
      ]
    });

    expect(items).toEqual([
      expect.objectContaining({
        id: 'issue:runtime-config-missing',
        severity: 'warning',
        domain: 'config'
      })
    ]);
  });

  it('returns an empty list when only healthy or optional signals are present', () => {
    expect(
      compose({
        logs: [],
        queryIssues: [
          {
            id: 'runtime-channel-directory-missing',
            code: 'missing_path',
            severity: 'info',
            summary: 'channel_directory.json not found',
            detail: 'Connected surface counts may be incomplete.'
          }
        ]
      })
    ).toEqual([]);
  });
});
