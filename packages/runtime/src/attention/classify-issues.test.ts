import { describe, expect, it } from 'vitest';

import type { HermesQueryIssue } from '../hermes-query.js';
import { classifyHermesQueryIssue } from './classify-issues.js';

const createIssue = (issue: Partial<HermesQueryIssue> & Pick<HermesQueryIssue, 'id'>): HermesQueryIssue => ({
  id: issue.id,
  code: issue.code ?? 'missing_path',
  severity: issue.severity ?? 'warning',
  summary: issue.summary ?? 'Issue summary',
  detail: issue.detail ?? 'Issue detail',
  ...(issue.path ? { path: issue.path } : {}),
  ...(issue.lookedFor ? { lookedFor: issue.lookedFor } : {})
});

describe('classifyHermesQueryIssue', () => {
  it('promotes a missing Hermes root to critical runtime attention', () => {
    const item = classifyHermesQueryIssue(
      createIssue({
        id: 'runtime-hermes-root-missing',
        severity: 'error',
        path: '/tmp/hermes'
      })
    );

    expect(item).toMatchObject({
      severity: 'critical',
      domain: 'runtime',
      isActionable: true,
      isOptionalSurface: false
    });
  });

  it('keeps config problems as warning attention', () => {
    const item = classifyHermesQueryIssue(
      createIssue({
        id: 'runtime-config-missing',
        path: '/tmp/hermes/config.yaml'
      })
    );

    expect(item).toMatchObject({
      severity: 'warning',
      domain: 'config',
      isActionable: true
    });
  });

  it('keeps state database absence actionable when no session source exists', () => {
    const item = classifyHermesQueryIssue(
      createIssue({
        id: 'sessions-sources-missing',
        lookedFor: ['/tmp/hermes/state.db']
      })
    );

    expect(item).toMatchObject({
      severity: 'warning',
      domain: 'sessions',
      isActionable: true
    });
  });

  it('omits optional missing runtime snapshots from primary attention', () => {
    expect(
      classifyHermesQueryIssue(
        createIssue({
          id: 'runtime-update-cache-missing',
          severity: 'info',
          path: '/tmp/hermes/.update_check'
        })
      )
    ).toBeNull();

    expect(
      classifyHermesQueryIssue(
        createIssue({
          id: 'runtime-channel-directory-missing',
          severity: 'info',
          path: '/tmp/hermes/channel_directory.json'
        })
      )
    ).toBeNull();
  });

  it('classifies parse failures and missing dependencies as warnings', () => {
    expect(
      classifyHermesQueryIssue(
        createIssue({
          id: 'sessions-sessions-invalid-json-shape',
          code: 'parse_failed',
          path: '/tmp/hermes/state.db'
        })
      )
    ).toMatchObject({
      severity: 'warning',
      domain: 'sessions'
    });

    expect(
      classifyHermesQueryIssue(
        createIssue({
          id: 'sessions-sessions-sqlite-bridge-missing',
          code: 'missing_dependency',
          path: 'python3'
        })
      )
    ).toMatchObject({
      severity: 'warning',
      domain: 'sessions'
    });
  });

  it('omits scan disabled issues from primary attention', () => {
    expect(
      classifyHermesQueryIssue(
        createIssue({
          id: 'workspace-scan-disabled',
          code: 'scan_disabled',
          severity: 'info'
        })
      )
    ).toBeNull();
  });
});
