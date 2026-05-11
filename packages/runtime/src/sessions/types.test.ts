import { describe, expect, it } from 'vitest';

import { sessionDetailSchema } from './types.js';

const sessionSummary = {
  id: 'default:session-1',
  agentId: 'default',
  agentLabel: 'Default',
  agentSource: 'root' as const,
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
  startedAt: '2026-04-10T12:00:00.000Z',
  endedAt: '2026-04-10T12:10:00.000Z',
  lastActivityAt: '2026-04-10T12:10:00.000Z',
  messageCount: 2,
  toolCallCount: 1,
  totalTokens: 30,
  estimatedCostUsd: 0.02,
  costStatus: 'estimated',
  memoryFlushed: false,
  hasStateTranscript: true,
  hasMessagingMetadata: false,
  cronJobId: null,
  cronJobName: null
};

describe('sessionDetailSchema', () => {
  it('accepts session detail payloads with transcript and usage stats', () => {
    const parsed = sessionDetailSchema.parse({
      session: sessionSummary,
      messages: [
        {
          id: 1,
          sessionId: 'session-1',
          role: 'assistant',
          content: 'I will inspect the files.',
          contentCharCount: 25,
          contentOmittedCharCount: 0,
          toolCallId: null,
          toolCalls: [
            {
              id: 'call-1',
              name: 'exec_command',
              argumentsPreview: '{"cmd":"ls"}'
            }
          ],
          toolName: null,
          finishReason: 'tool_calls',
          timestamp: '2026-04-10T12:01:00.000Z',
          tokenCount: 12
        }
      ],
      transcript: {
        totalMessageCount: 1,
        returnedMessageCount: 1,
        omittedMessageCount: 0,
        contentCharCount: 25,
        returnedContentCharCount: 25,
        omittedContentCharCount: 0,
        messageHeadCount: 50,
        messageTailCount: 200,
        maxMessageContentChars: 6_000
      },
      stats: {
        durationMs: 600_000,
        messageCount: 2,
        toolCallCount: 1,
        inputTokens: 10,
        outputTokens: 20,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
        reasoningTokens: 0,
        totalTokens: 30,
        estimatedCostUsd: 0.02,
        actualCostUsd: null
      },
      lineage: {
        parentSessionId: 'parent-session'
      }
    });

    expect(parsed.messages[0]?.toolCalls[0]?.name).toBe('exec_command');
    expect(parsed.stats.totalTokens).toBe(30);
    expect(parsed.lineage.parentSessionId).toBe('parent-session');
  });
});
