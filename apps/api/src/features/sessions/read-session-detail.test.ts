import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
  readCronJobIndexResultMock,
  readHermesInstallationResultMock,
  readMessagingSessionsResultMock,
  readStateDbBoundedMessagesResultMock,
  readStateDbMessagesResultMock,
  readStateDbSessionsResultMock
} = vi.hoisted(() => ({
  readCronJobIndexResultMock: vi.fn(),
  readHermesInstallationResultMock: vi.fn(),
  readMessagingSessionsResultMock: vi.fn(),
  readStateDbBoundedMessagesResultMock: vi.fn(),
  readStateDbMessagesResultMock: vi.fn(),
  readStateDbSessionsResultMock: vi.fn()
}));

vi.mock('@/features/inventory/read-installation', () => ({
  readHermesInstallationResult: readHermesInstallationResultMock
}));

vi.mock('@/features/sessions/node-session-sources', () => ({
  readMessagingSessionsResult: readMessagingSessionsResultMock,
  readStateDbBoundedMessagesResult: readStateDbBoundedMessagesResultMock,
  readStateDbMessagesResult: readStateDbMessagesResultMock,
  readStateDbSessionsResult: readStateDbSessionsResultMock
}));

vi.mock('@/features/sessions/read-cron-job-index', () => ({
  readCronJobIndexResult: readCronJobIndexResultMock
}));

import { readHermesSessionDetail } from '@/features/sessions/read-session-detail';

const isoStartedAt = '2026-04-10T12:00:00.000Z';
const isoEndedAt = '2026-04-10T12:10:00.000Z';

const createPresence = ({ sessions = false, stateDb = false }: { sessions?: boolean; stateDb?: boolean }) => ({
  config: false,
  memory: false,
  sessions,
  cron: false,
  skills: false,
  stateDb
});

describe('readHermesSessionDetail', () => {
  beforeEach(() => {
    readHermesInstallationResultMock.mockReturnValue({
      data: {
        agents: [
          {
            id: 'default',
            label: 'Default',
            rootPath: '/tmp/hermes',
            source: 'root',
            presence: createPresence({
              stateDb: true
            }),
            isAvailable: true
          }
        ]
      },
      issues: []
    });
    readCronJobIndexResultMock.mockReturnValue({
      data: [],
      issues: []
    });
    readMessagingSessionsResultMock.mockReturnValue({
      data: [],
      issues: []
    });
    readStateDbBoundedMessagesResultMock.mockReturnValue({
      data: {
        messages: [],
        totalMessageCount: 0,
        returnedMessageCount: 0,
        omittedMessageCount: 0,
        contentCharCount: 0,
        selectedContentCharCount: 0,
        omittedRowContentCharCount: 0,
        messageHeadCount: 50,
        messageTailCount: 200
      },
      issues: []
    });
    readStateDbMessagesResultMock.mockReturnValue({
      data: [],
      issues: []
    });
    readStateDbSessionsResultMock.mockReturnValue({
      data: [
        {
          id: 'session-1',
          source: 'cli',
          userId: null,
          model: 'gpt-5',
          parentSessionId: 'parent-session',
          startedAt: isoStartedAt,
          endedAt: isoEndedAt,
          endReason: 'user_exit',
          messageCount: 2,
          toolCallCount: 1,
          inputTokens: 10,
          outputTokens: 20,
          cacheReadTokens: 3,
          cacheWriteTokens: 4,
          reasoningTokens: 5,
          estimatedCostUsd: 0.02,
          actualCostUsd: 0.03,
          costStatus: 'estimated',
          title: 'Debug session'
        }
      ],
      issues: []
    });
  });

  afterEach(() => {
    readCronJobIndexResultMock.mockReset();
    readHermesInstallationResultMock.mockReset();
    readMessagingSessionsResultMock.mockReset();
    readStateDbBoundedMessagesResultMock.mockReset();
    readStateDbMessagesResultMock.mockReset();
    readStateDbSessionsResultMock.mockReset();
  });

  it('returns detail metadata, stats, lineage, messages, and summarized tool calls', () => {
    readStateDbBoundedMessagesResultMock.mockReturnValue({
      data: {
        messages: [
          {
            id: 1,
            sessionId: 'session-1',
            role: 'assistant',
            content: 'I will inspect the files.',
            contentCharCount: 25,
            toolCallId: null,
            toolCallsJson: JSON.stringify([
              {
                id: 'call-1',
                function: {
                  name: 'exec_command',
                  arguments: '{"cmd":"ls"}'
                }
              }
            ]),
            toolName: null,
            finishReason: 'tool_calls',
            timestamp: '2026-04-10T12:01:00.000Z',
            tokenCount: 12
          }
        ],
        totalMessageCount: 1,
        returnedMessageCount: 1,
        omittedMessageCount: 0,
        contentCharCount: 25,
        selectedContentCharCount: 25,
        omittedRowContentCharCount: 0,
        messageHeadCount: 50,
        messageTailCount: 200
      },
      issues: []
    });

    const result = readHermesSessionDetail({
      agentId: 'default',
      sessionId: 'session-1'
    });

    expect(result?.issues).toEqual([]);
    expect(result?.data.session.title).toBe('Debug session');
    expect(result?.data.lineage.parentSessionId).toBe('parent-session');
    expect(readStateDbBoundedMessagesResultMock).toHaveBeenCalledWith({
      agentRootPath: '/tmp/hermes',
      messageHeadCount: 50,
      messageTailCount: 200,
      sessionId: 'session-1'
    });
    expect(result?.data.stats).toEqual({
      durationMs: 600_000,
      messageCount: 2,
      toolCallCount: 1,
      inputTokens: 10,
      outputTokens: 20,
      cacheReadTokens: 3,
      cacheWriteTokens: 4,
      reasoningTokens: 5,
      totalTokens: 42,
      estimatedCostUsd: 0.02,
      actualCostUsd: 0.03
    });
    expect(result?.data.messages[0]).toEqual(
      expect.objectContaining({
        contentOmittedCharCount: 0,
        role: 'assistant',
        toolCalls: [
          {
            id: 'call-1',
            name: 'exec_command',
            argumentsPreview: '{"cmd":"ls"}'
          }
        ]
      })
    );
    expect(result?.data.transcript).toEqual({
      totalMessageCount: 1,
      returnedMessageCount: 1,
      omittedMessageCount: 0,
      contentCharCount: 25,
      returnedContentCharCount: 25,
      omittedContentCharCount: 0,
      messageHeadCount: 50,
      messageTailCount: 200,
      maxMessageContentChars: 6000
    });
  });

  it('bounds long transcripts and long message content before returning API detail data', () => {
    const longContent = 'a'.repeat(7_500);
    readStateDbBoundedMessagesResultMock.mockReturnValue({
      data: {
        messages: [
          {
            id: 1,
            sessionId: 'session-1',
            role: 'user',
            content: longContent,
            contentCharCount: longContent.length,
            toolCallId: null,
            toolCallsJson: null,
            toolName: null,
            finishReason: null,
            timestamp: '2026-04-10T12:01:00.000Z',
            tokenCount: null
          },
          {
            id: 999,
            sessionId: 'session-1',
            role: 'assistant',
            content: 'tail message',
            contentCharCount: 12,
            toolCallId: null,
            toolCallsJson: null,
            toolName: null,
            finishReason: null,
            timestamp: '2026-04-10T12:09:00.000Z',
            tokenCount: null
          }
        ],
        totalMessageCount: 400,
        returnedMessageCount: 2,
        omittedMessageCount: 398,
        contentCharCount: 20_000,
        selectedContentCharCount: 7_512,
        omittedRowContentCharCount: 12_488,
        messageHeadCount: 50,
        messageTailCount: 200
      },
      issues: []
    });

    const result = readHermesSessionDetail({
      agentId: 'default',
      sessionId: 'session-1'
    });

    expect(result?.data.messages).toHaveLength(2);
    expect(result?.data.messages[0]?.content?.length).toBe(6_000);
    expect(result?.data.messages[0]?.contentOmittedCharCount).toBe(1_500);
    expect(result?.data.transcript.omittedMessageCount).toBe(398);
    expect(result?.data.transcript.omittedContentCharCount).toBe(13_988);
  });

  it('returns null for a missing session', () => {
    const result = readHermesSessionDetail({
      agentId: 'default',
      sessionId: 'missing-session'
    });

    expect(result).toBeNull();
    expect(readStateDbBoundedMessagesResultMock).not.toHaveBeenCalled();
  });
});
