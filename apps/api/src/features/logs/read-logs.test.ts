import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { readHermesSessionsResultMock } = vi.hoisted(() => ({
  readHermesSessionsResultMock: vi.fn()
}));

vi.mock('@/features/sessions/read-hermes-sessions', () => ({
  readHermesSessionsResult: readHermesSessionsResultMock
}));

import { readHermesLogsResult } from '@/features/logs/read-logs';

const previousHermesRoot = process.env.HERMES_CONSOLE_HERMES_DIR;

const createSession = ({ agentId, sessionId }: { agentId: string; sessionId: string }) => ({
  id: `${agentId}:${sessionId}`,
  agentId,
  agentLabel: agentId,
  agentSource: agentId === 'default' ? ('root' as const) : ('profile' as const),
  agentRootPath: `/tmp/hermes/${agentId}`,
  sessionId,
  sessionKey: null,
  source: 'cli',
  sourceLabel: 'cli',
  title: sessionId,
  displayName: null,
  platform: null,
  chatType: null,
  model: null,
  startedAt: '2026-04-05T22:00:00.000Z',
  endedAt: null,
  endReason: null,
  lastActivityAt: '2026-04-05T22:35:00.000Z',
  messageCount: 1,
  toolCallCount: 0,
  totalTokens: 0,
  estimatedCostUsd: null,
  costStatus: null,
  memoryFlushed: null,
  hasStateTranscript: true,
  hasMessagingMetadata: false,
  cronJobId: null,
  cronJobName: null
});

const writeLog = ({ hermesRoot, name, content }: { hermesRoot: string; name: string; content: string }) => {
  const logsRoot = path.join(hermesRoot, 'logs');

  fs.mkdirSync(logsRoot, { recursive: true });
  fs.writeFileSync(path.join(logsRoot, name), content);
};

describe('readHermesLogsResult', () => {
  beforeEach(() => {
    readHermesSessionsResultMock.mockReturnValue({
      data: {
        sessions: [
          createSession({
            agentId: 'default',
            sessionId: 'session-1'
          }),
          createSession({
            agentId: 'default',
            sessionId: 'ambiguous-session'
          }),
          createSession({
            agentId: 'alpha',
            sessionId: 'ambiguous-session'
          })
        ]
      },
      issues: []
    });
  });

  afterEach(() => {
    readHermesSessionsResultMock.mockReset();

    if (previousHermesRoot == null) {
      delete process.env.HERMES_CONSOLE_HERMES_DIR;
      return;
    }

    process.env.HERMES_CONSOLE_HERMES_DIR = previousHermesRoot;
  });

  it('summarizes recent warning and error events from bounded log tails', () => {
    const hermesRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'hermes-console-logs-'));

    process.env.HERMES_CONSOLE_HERMES_DIR = hermesRoot;
    writeLog({
      hermesRoot,
      name: 'agent.log',
      content: [
        '2026-04-05 22:30:00 INFO agent.runner: startup complete',
        `2026-04-05 22:35:00 ERROR [session-1] gateway.sessions: ${'failed '.repeat(80)}`,
        '2026-04-05 22:36:00 WARNING [ambiguous-session] cron.runner: slow job'
      ].join('\n')
    });
    writeLog({
      hermesRoot,
      name: 'errors.log',
      content: '2026-04-05 22:37:00 CRITICAL tools.terminal_tool: command failed'
    });

    const result = readHermesLogsResult();

    expect(result.data.logs).toEqual([
      expect.objectContaining({
        id: 'agent.log',
        analyzedLineCount: 3,
        errorLineCount: 1,
        warningLineCount: 1,
        infoLineCount: 1
      }),
      expect.objectContaining({
        id: 'errors.log',
        errorLineCount: 1
      })
    ]);
    expect(result.data.eventSummary).toEqual(
      expect.objectContaining({
        analyzedLineCount: 4,
        recentErrorCount: 2,
        recentWarningCount: 1
      })
    );
    expect(result.data.eventSummary.componentGroups).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'gateway',
          errorCount: 1
        }),
        expect.objectContaining({
          id: 'cron',
          warningCount: 1
        }),
        expect.objectContaining({
          id: 'tools',
          errorCount: 1
        })
      ])
    );
    expect(result.data.eventSummary.fileGroups).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'agent.log',
          errorCount: 1,
          warningCount: 1
        }),
        expect.objectContaining({
          id: 'errors.log',
          errorCount: 1
        })
      ])
    );
    expect(result.data.eventSummary.topEvents[0]).toEqual(
      expect.objectContaining({
        level: 'error',
        logName: 'errors.log',
        message: 'command failed'
      })
    );
    expect(result.data.eventSummary.topEvents.find((event) => event.sessionId === 'session-1')?.sessionLink).toEqual({
      agentId: 'default',
      href: '/sessions/default/session-1',
      sessionId: 'session-1'
    });
    expect(
      result.data.eventSummary.topEvents.find((event) => event.sessionId === 'ambiguous-session')?.sessionLink
    ).toBeNull();
    expect(result.data.eventSummary.topEvents.find((event) => event.sessionId === 'session-1')?.message.length).toBe(
      280
    );
  });

  it('returns an empty event summary when no logs directory exists', () => {
    const hermesRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'hermes-console-logs-missing-'));

    process.env.HERMES_CONSOLE_HERMES_DIR = hermesRoot;

    const result = readHermesLogsResult();

    expect(result.data.eventSummary).toEqual({
      analyzedLineCount: 0,
      recentErrorCount: 0,
      recentWarningCount: 0,
      topEvents: [],
      componentGroups: [],
      fileGroups: []
    });
  });
});
