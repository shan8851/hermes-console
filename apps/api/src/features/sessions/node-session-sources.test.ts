import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

const { execFileSyncMock } = vi.hoisted(() => ({
  execFileSyncMock: vi.fn()
}));

vi.mock('node:child_process', () => ({
  execFileSync: execFileSyncMock
}));

import {
  readStateDbBoundedMessagesResult,
  readStateDbMessagesResult,
  readStateDbSessionsResult
} from '@/features/sessions/node-session-sources';

describe('readStateDbSessionsResult', () => {
  afterEach(() => {
    execFileSyncMock.mockReset();
  });

  it('surfaces missing Python as a missing dependency issue', () => {
    const agentRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'hermes-console-sessions-'));
    fs.writeFileSync(path.join(agentRoot, 'state.db'), '');
    const error = new Error('python3 missing');

    Object.assign(error, { code: 'ENOENT' });
    execFileSyncMock.mockImplementation(() => {
      throw error;
    });

    const result = readStateDbSessionsResult(agentRoot);

    expect(result.data).toEqual([]);
    expect(result.issues[0]?.code).toBe('missing_dependency');
  });

  it('surfaces malformed SQLite bridge payloads as parse failures', () => {
    const agentRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'hermes-console-sessions-'));
    fs.writeFileSync(path.join(agentRoot, 'state.db'), '');
    execFileSyncMock.mockReturnValueOnce(JSON.stringify([{ id: 'session-1' }]));

    const result = readStateDbSessionsResult(agentRoot);

    expect(result.data).toEqual([]);
    expect(result.issues[0]?.code).toBe('parse_failed');
  });

  it('drops invalid session rows but keeps valid rows with a compact parse issue', () => {
    const agentRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'hermes-console-sessions-'));
    fs.writeFileSync(path.join(agentRoot, 'state.db'), '');
    execFileSyncMock.mockReturnValueOnce(
      JSON.stringify([
        {
          id: 'session-1',
          source: 'cli',
          userId: null,
          model: null,
          parentSessionId: null,
          startedAt: '2025-01-01T00:00:00Z',
          endedAt: null,
          endReason: null,
          messageCount: 1,
          toolCallCount: 0,
          inputTokens: 10,
          outputTokens: 20,
          cacheReadTokens: 0,
          cacheWriteTokens: 0,
          reasoningTokens: 0,
          estimatedCostUsd: null,
          actualCostUsd: null,
          costStatus: null,
          title: null
        },
        {
          id: 'session-2',
          source: 'cli',
          userId: null,
          model: null,
          parentSessionId: null,
          startedAt: null,
          endedAt: null,
          endReason: null,
          messageCount: 1,
          toolCallCount: 0,
          inputTokens: 10,
          outputTokens: 20,
          cacheReadTokens: 0,
          cacheWriteTokens: 0,
          reasoningTokens: 0,
          estimatedCostUsd: null,
          actualCostUsd: null,
          costStatus: null,
          title: null
        }
      ])
    );

    const result = readStateDbSessionsResult(agentRoot);

    expect(result.data).toHaveLength(1);
    expect(result.data[0]?.id).toBe('session-1');
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0]?.code).toBe('parse_failed');
    expect(result.issues[0]?.detail).toBe(
      'Dropped 1 invalid session row. First error: startedAt expected string, received null.'
    );
  });

  it('drops invalid message rows but keeps valid rows with a compact parse issue', () => {
    const agentRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'hermes-console-sessions-'));
    fs.writeFileSync(path.join(agentRoot, 'state.db'), '');
    execFileSyncMock.mockReturnValueOnce(
      JSON.stringify([
        {
          id: 1,
          sessionId: 'session-1',
          role: 'assistant',
          content: 'hello',
          contentCharCount: 5,
          toolCallId: null,
          toolCallsJson: null,
          toolName: null,
          finishReason: null,
          timestamp: '2025-01-01T00:00:00Z',
          tokenCount: 12
        },
        {
          id: 2,
          sessionId: 'session-1',
          role: 'assistant',
          content: 'broken',
          contentCharCount: 6,
          toolCallId: null,
          toolCallsJson: null,
          toolName: null,
          finishReason: null,
          timestamp: null,
          tokenCount: 12
        }
      ])
    );

    const result = readStateDbMessagesResult({
      agentRootPath: agentRoot,
      sessionId: 'session-1'
    });

    expect(result.data).toHaveLength(1);
    expect(result.data[0]?.id).toBe(1);
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0]?.detail).toBe(
      'Dropped 1 invalid message row. First error: timestamp expected string, received null.'
    );
    expect(result.issues[0]?.detail).not.toContain('[');
    expect(result.issues[0]?.detail).not.toContain('path');
  });

  it('reads bounded message windows with omission metadata', () => {
    const agentRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'hermes-console-sessions-'));
    fs.writeFileSync(path.join(agentRoot, 'state.db'), '');
    execFileSyncMock.mockReturnValueOnce(
      JSON.stringify({
        messages: [
          {
            id: 1,
            sessionId: 'session-1',
            role: 'user',
            content: 'first',
            contentCharCount: 5,
            toolCallId: null,
            toolCallsJson: null,
            toolName: null,
            finishReason: null,
            timestamp: '2025-01-01T00:00:00Z',
            tokenCount: null
          },
          {
            id: 300,
            sessionId: 'session-1',
            role: 'assistant',
            content: 'last',
            contentCharCount: 4,
            toolCallId: null,
            toolCallsJson: null,
            toolName: null,
            finishReason: null,
            timestamp: '2025-01-01T01:00:00Z',
            tokenCount: null
          }
        ],
        totalMessageCount: 300,
        returnedMessageCount: 2,
        omittedMessageCount: 298,
        contentCharCount: 900,
        selectedContentCharCount: 9,
        omittedRowContentCharCount: 891,
        messageHeadCount: 1,
        messageTailCount: 1
      })
    );

    const result = readStateDbBoundedMessagesResult({
      agentRootPath: agentRoot,
      sessionId: 'session-1',
      messageHeadCount: 1,
      messageTailCount: 1
    });

    expect(execFileSyncMock).toHaveBeenCalledWith(
      'python3',
      ['-c', expect.any(String), path.join(agentRoot, 'state.db'), 'messages_bounded', 'session-1', '1', '1', '6000'],
      expect.any(Object)
    );
    expect(result.issues).toEqual([]);
    expect(result.data.messages.map((message) => message.id)).toEqual([1, 300]);
    expect(result.data.omittedMessageCount).toBe(298);
    expect(result.data.omittedRowContentCharCount).toBe(891);
  });
});
