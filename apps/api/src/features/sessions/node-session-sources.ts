import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

import { ZodError, z } from 'zod';
import {
  createMissingDependencyIssue,
  createParseFailedIssue,
  createUnreadablePathIssue
} from '@/lib/query-issue-factories';
import { createReadResult, type ReadResult } from '@/lib/read-result';
import type {
  AgentSessionMessageRecord,
  AgentStateSessionRecord,
  HermesQueryIssue,
  MessagingSessionRecord
} from '@hermes-console/runtime';
import { agentSessionMessageRecordSchema, agentStateSessionRecordSchema } from '@hermes-console/runtime';
import { parseMessagingSessionIndex } from '@/features/sessions/read-sessions';

const BOUNDED_MESSAGE_CONTENT_LENGTH = 6_000;

const SQLITE_SCRIPT = String.raw`
import json
import sqlite3
import sys
from datetime import datetime, timezone


def to_iso(value):
    if value is None:
        return None
    try:
        return datetime.fromtimestamp(float(value), tz=timezone.utc).isoformat().replace('+00:00', 'Z')
    except Exception:
        return None


def row_to_session(row):
    return {
        'id': row['id'],
        'source': row['source'],
        'userId': row['user_id'],
        'model': row['model'],
        'parentSessionId': row['parent_session_id'],
        'startedAt': to_iso(row['started_at']),
        'endedAt': to_iso(row['ended_at']),
        'endReason': row['end_reason'],
        'messageCount': row['message_count'] or 0,
        'toolCallCount': row['tool_call_count'] or 0,
        'inputTokens': row['input_tokens'] or 0,
        'outputTokens': row['output_tokens'] or 0,
        'cacheReadTokens': row['cache_read_tokens'] or 0,
        'cacheWriteTokens': row['cache_write_tokens'] or 0,
        'reasoningTokens': row['reasoning_tokens'] or 0,
        'estimatedCostUsd': row['estimated_cost_usd'],
        'actualCostUsd': row['actual_cost_usd'],
        'costStatus': row['cost_status'],
        'title': row['title'],
    }


def row_to_message(row):
    return {
        'id': row['id'],
        'sessionId': row['session_id'],
        'role': row['role'],
        'content': row['content'],
        'contentCharCount': row['content_char_count'],
        'toolCallId': row['tool_call_id'],
        'toolCallsJson': row['tool_calls'],
        'toolName': row['tool_name'],
        'finishReason': row['finish_reason'],
        'timestamp': to_iso(row['timestamp']),
        'tokenCount': row['token_count'],
    }


def table_columns(cur, table_name):
    return {row['name'] for row in cur.execute(f'PRAGMA table_info({table_name})')}


def select_column(columns, name, fallback='NULL'):
    return name if name in columns else f'{fallback} AS {name}'


def message_content_select(columns, max_content_chars=None):
    if 'content' not in columns:
        return 'NULL AS content, NULL AS content_char_count'
    if max_content_chars is None:
        return 'content, LENGTH(content) AS content_char_count'
    return f'SUBSTR(content, 1, {max_content_chars}) AS content, LENGTH(content) AS content_char_count'


def message_order_clause(columns, direction='ASC'):
    if 'timestamp' in columns:
        return f'timestamp {direction}, id {direction}'
    return f'id {direction}'


def session_select_sql(columns):
    selected_columns = [
        select_column(columns, 'id'),
        select_column(columns, 'source'),
        select_column(columns, 'user_id'),
        select_column(columns, 'model'),
        select_column(columns, 'parent_session_id'),
        select_column(columns, 'started_at'),
        select_column(columns, 'ended_at'),
        select_column(columns, 'end_reason'),
        select_column(columns, 'message_count', '0'),
        select_column(columns, 'tool_call_count', '0'),
        select_column(columns, 'input_tokens', '0'),
        select_column(columns, 'output_tokens', '0'),
        select_column(columns, 'cache_read_tokens', '0'),
        select_column(columns, 'cache_write_tokens', '0'),
        select_column(columns, 'reasoning_tokens', '0'),
        select_column(columns, 'estimated_cost_usd'),
        select_column(columns, 'actual_cost_usd'),
        select_column(columns, 'cost_status'),
        select_column(columns, 'title'),
    ]
    order_column = 'started_at' if 'started_at' in columns else 'id'
    return f"SELECT {', '.join(selected_columns)} FROM sessions ORDER BY {order_column} DESC"


def message_select_sql(columns, *, max_content_chars=None, order_direction='ASC', limit=False):
    selected_columns = [
        select_column(columns, 'id'),
        select_column(columns, 'session_id'),
        select_column(columns, 'role'),
        message_content_select(columns, max_content_chars),
        select_column(columns, 'tool_call_id'),
        select_column(columns, 'tool_calls'),
        select_column(columns, 'tool_name'),
        select_column(columns, 'finish_reason'),
        select_column(columns, 'timestamp'),
        select_column(columns, 'token_count'),
    ]
    limit_clause = ' LIMIT ?' if limit else ''
    return (
        f"SELECT {', '.join(selected_columns)} FROM messages "
        f"WHERE session_id = ? ORDER BY {message_order_clause(columns, order_direction)}{limit_clause}"
    )


def main():
    db_path = sys.argv[1]
    mode = sys.argv[2]
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    if mode == 'sessions':
        session_columns = table_columns(cur, 'sessions')
        cur.execute(session_select_sql(session_columns))
        print(json.dumps([row_to_session(row) for row in cur.fetchall()]))
        return

    if mode == 'messages':
        session_id = sys.argv[3]
        message_columns = table_columns(cur, 'messages')
        cur.execute(message_select_sql(message_columns), (session_id,))
        print(json.dumps([row_to_message(row) for row in cur.fetchall()]))
        return

    if mode == 'messages_bounded':
        session_id = sys.argv[3]
        head_limit = int(sys.argv[4])
        tail_limit = int(sys.argv[5])
        max_content_chars = int(sys.argv[6])
        message_columns = table_columns(cur, 'messages')
        content_sum_expr = 'COALESCE(SUM(LENGTH(content)), 0)' if 'content' in message_columns else '0'
        count_row = cur.execute(f'''
            SELECT
              COUNT(*) AS total_count,
              {content_sum_expr} AS total_content_chars
            FROM messages
            WHERE session_id = ?
        ''', (session_id,)).fetchone()
        total_count = count_row['total_count'] or 0
        total_content_chars = count_row['total_content_chars'] or 0

        if total_count <= head_limit + tail_limit:
            cur.execute(message_select_sql(message_columns, max_content_chars=max_content_chars), (session_id,))
            rows = cur.fetchall()
        else:
            cur.execute(
                message_select_sql(message_columns, max_content_chars=max_content_chars, order_direction='ASC', limit=True),
                (session_id, head_limit)
            )
            head_rows = cur.fetchall()
            cur.execute(
                message_select_sql(message_columns, max_content_chars=max_content_chars, order_direction='DESC', limit=True),
                (session_id, tail_limit)
            )
            tail_rows = list(reversed(cur.fetchall()))
            seen = set()
            rows = []
            for row in head_rows + tail_rows:
                if row['id'] in seen:
                    continue
                seen.add(row['id'])
                rows.append(row)

        selected_content_chars = sum(row['content_char_count'] for row in rows if row['content_char_count'] is not None)
        print(json.dumps({
            'messages': [row_to_message(row) for row in rows],
            'totalMessageCount': total_count,
            'returnedMessageCount': len(rows),
            'omittedMessageCount': max(total_count - len(rows), 0),
            'contentCharCount': total_content_chars,
            'selectedContentCharCount': selected_content_chars,
            'omittedRowContentCharCount': max(total_content_chars - selected_content_chars, 0),
            'messageHeadCount': head_limit,
            'messageTailCount': tail_limit,
        }))
        return

    raise SystemExit(f'Unsupported mode: {mode}')


if __name__ == '__main__':
    main()
	`;

function formatValidationErrorSummary(error: ZodError): string {
  const firstIssue = error.issues[0];

  if (!firstIssue) {
    return 'row had an invalid shape';
  }

  const fieldPath = firstIssue.path.length > 0 ? firstIssue.path.join('.') : 'value';
  const message = firstIssue.message.replace(/^Invalid input:\s*/i, '');

  return `${fieldPath} ${message}`;
}

function createDroppedRowsIssue({
  dbPath,
  droppedCount,
  mode,
  rowLabel,
  validationError
}: {
  dbPath: string;
  droppedCount: number;
  mode: 'sessions' | 'messages' | 'messages_bounded';
  rowLabel: 'session row' | 'message row';
  validationError: ZodError;
}): HermesQueryIssue {
  return createParseFailedIssue({
    id: `sessions-${mode}-invalid-rows`,
    summary: `Dropped invalid ${rowLabel}${droppedCount === 1 ? '' : 's'}`,
    detail: `Dropped ${droppedCount} invalid ${rowLabel}${droppedCount === 1 ? '' : 's'}. First error: ${formatValidationErrorSummary(validationError)}.`,
    path: dbPath
  });
}

function runSqliteJsonRowsQuery<T>({
  dbPath,
  mode,
  rowLabel,
  rowSchema,
  sessionId
}: {
  dbPath: string;
  mode: 'sessions' | 'messages';
  rowLabel: 'session row' | 'message row';
  rowSchema: z.ZodType<T>;
  sessionId?: string;
}): ReadResult<T[]> {
  try {
    const args = ['-c', SQLITE_SCRIPT, dbPath, mode];

    if (mode === 'messages' && sessionId) {
      args.push(sessionId);
    }

    const output = execFileSync('python3', args, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    });

    const parsed = JSON.parse(output) as unknown;

    if (!Array.isArray(parsed)) {
      return createReadResult({
        data: [],
        issues: [
          createParseFailedIssue({
            id: `sessions-${mode}-invalid-json-shape`,
            summary: 'Session database output had an unexpected shape',
            detail: 'Hermes Console expected the SQLite bridge to return a JSON array.',
            path: dbPath
          })
        ]
      });
    }

    const issues: HermesQueryIssue[] = [];
    const validRows: T[] = [];
    let droppedCount = 0;
    let firstValidationError: ZodError | null = null;

    for (const row of parsed) {
      const validatedRow = rowSchema.safeParse(row);

      if (validatedRow.success) {
        validRows.push(validatedRow.data);
        continue;
      }

      droppedCount += 1;

      if (firstValidationError == null) {
        firstValidationError = validatedRow.error;
      }
    }

    if (droppedCount > 0 && firstValidationError) {
      issues.push(
        createDroppedRowsIssue({
          dbPath,
          droppedCount,
          mode,
          rowLabel,
          validationError: firstValidationError
        })
      );
    }

    return createReadResult({
      data: validRows,
      issues
    });
  } catch (error) {
    const issue =
      error instanceof SyntaxError || error instanceof ZodError
        ? createParseFailedIssue({
            id: `sessions-${mode}-json-parse-failed`,
            summary: 'Session database output could not be parsed',
            detail: error.message || 'Hermes Console could not parse JSON returned from the SQLite bridge.',
            path: dbPath
          })
        : error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT'
          ? createMissingDependencyIssue({
              id: `sessions-${mode}-sqlite-bridge-missing`,
              summary: 'Python runtime is unavailable',
              detail: 'Hermes Console could not run the Python SQLite bridge needed to inspect session databases.',
              path: 'python3'
            })
          : createUnreadablePathIssue({
              id: `sessions-${mode}-sqlite-read-failed`,
              summary: 'Session database could not be read',
              detail:
                error instanceof Error
                  ? error.message
                  : 'Hermes Console could not read the SQLite-backed session database.',
              path: dbPath
            });

    return createReadResult({
      data: [],
      issues: [issue]
    });
  }
}

function runSqliteJsonValueQuery<T>({
  dbPath,
  maxMessageContentChars,
  messageHeadCount,
  messageTailCount,
  mode,
  rowSchema,
  sessionId
}: {
  dbPath: string;
  maxMessageContentChars: number;
  messageHeadCount: number;
  messageTailCount: number;
  mode: 'messages_bounded';
  rowSchema: z.ZodType<T>;
  sessionId: string;
}): ReadResult<T | null> {
  try {
    const output = execFileSync(
      'python3',
      [
        '-c',
        SQLITE_SCRIPT,
        dbPath,
        mode,
        sessionId,
        String(messageHeadCount),
        String(messageTailCount),
        String(maxMessageContentChars)
      ],
      {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe']
      }
    );
    const parsed = JSON.parse(output) as unknown;
    const validated = rowSchema.safeParse(parsed);

    if (validated.success) {
      return createReadResult({
        data: validated.data
      });
    }

    return createReadResult({
      data: null,
      issues: [
        createParseFailedIssue({
          id: `sessions-${mode}-invalid-json-shape`,
          summary: 'Session database output had an unexpected shape',
          detail: `Hermes Console could not validate bounded message output. First error: ${formatValidationErrorSummary(validated.error)}.`,
          path: dbPath
        })
      ]
    });
  } catch (error) {
    const issue =
      error instanceof SyntaxError || error instanceof ZodError
        ? createParseFailedIssue({
            id: `sessions-${mode}-json-parse-failed`,
            summary: 'Session database output could not be parsed',
            detail: error.message || 'Hermes Console could not parse JSON returned from the SQLite bridge.',
            path: dbPath
          })
        : error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT'
          ? createMissingDependencyIssue({
              id: `sessions-${mode}-sqlite-bridge-missing`,
              summary: 'Python runtime is unavailable',
              detail: 'Hermes Console could not run the Python SQLite bridge needed to inspect session databases.',
              path: 'python3'
            })
          : createUnreadablePathIssue({
              id: `sessions-${mode}-sqlite-read-failed`,
              summary: 'Session database could not be read',
              detail:
                error instanceof Error
                  ? error.message
                  : 'Hermes Console could not read the SQLite-backed session database.',
              path: dbPath
            });

    return createReadResult({
      data: null,
      issues: [issue]
    });
  }
}

export function readStateDbSessionsResult(agentRootPath: string): ReadResult<AgentStateSessionRecord[]> {
  const dbPath = path.join(agentRootPath, 'state.db');

  if (!fs.existsSync(dbPath)) {
    return createReadResult({
      data: []
    });
  }

  const result = runSqliteJsonRowsQuery<AgentStateSessionRecord>({
    dbPath,
    mode: 'sessions',
    rowLabel: 'session row',
    rowSchema: agentStateSessionRecordSchema
  });

  return createReadResult({
    data: result.data,
    issues: result.issues
  });
}

export function readStateDbSessions(agentRootPath: string): AgentStateSessionRecord[] {
  return readStateDbSessionsResult(agentRootPath).data;
}

export function readStateDbMessagesResult({
  agentRootPath,
  sessionId
}: {
  agentRootPath: string;
  sessionId: string;
}): ReadResult<AgentSessionMessageRecord[]> {
  const dbPath = path.join(agentRootPath, 'state.db');

  if (!fs.existsSync(dbPath)) {
    return createReadResult({
      data: []
    });
  }

  return runSqliteJsonRowsQuery<AgentSessionMessageRecord>({
    dbPath,
    mode: 'messages',
    rowLabel: 'message row',
    rowSchema: agentSessionMessageRecordSchema,
    sessionId
  });
}

export function readStateDbMessages({
  agentRootPath,
  sessionId
}: {
  agentRootPath: string;
  sessionId: string;
}): AgentSessionMessageRecord[] {
  return readStateDbMessagesResult({
    agentRootPath,
    sessionId
  }).data;
}

export type BoundedStateDbMessages = {
  messages: AgentSessionMessageRecord[];
  totalMessageCount: number;
  returnedMessageCount: number;
  omittedMessageCount: number;
  contentCharCount: number;
  selectedContentCharCount: number;
  omittedRowContentCharCount: number;
  messageHeadCount: number;
  messageTailCount: number;
};

const boundedStateDbMessagesSchema = z.object({
  messages: z.array(agentSessionMessageRecordSchema),
  totalMessageCount: z.number(),
  returnedMessageCount: z.number(),
  omittedMessageCount: z.number(),
  contentCharCount: z.number(),
  selectedContentCharCount: z.number(),
  omittedRowContentCharCount: z.number(),
  messageHeadCount: z.number(),
  messageTailCount: z.number()
});

const emptyBoundedStateDbMessages = ({
  messageHeadCount,
  messageTailCount
}: {
  messageHeadCount: number;
  messageTailCount: number;
}): BoundedStateDbMessages => ({
  messages: [],
  totalMessageCount: 0,
  returnedMessageCount: 0,
  omittedMessageCount: 0,
  contentCharCount: 0,
  selectedContentCharCount: 0,
  omittedRowContentCharCount: 0,
  messageHeadCount,
  messageTailCount
});

export function readStateDbBoundedMessagesResult({
  agentRootPath,
  messageHeadCount,
  messageTailCount,
  sessionId
}: {
  agentRootPath: string;
  messageHeadCount: number;
  messageTailCount: number;
  sessionId: string;
}): ReadResult<BoundedStateDbMessages> {
  const dbPath = path.join(agentRootPath, 'state.db');

  if (!fs.existsSync(dbPath)) {
    return createReadResult({
      data: emptyBoundedStateDbMessages({
        messageHeadCount,
        messageTailCount
      })
    });
  }

  const result = runSqliteJsonValueQuery({
    dbPath,
    mode: 'messages_bounded',
    rowSchema: boundedStateDbMessagesSchema,
    sessionId,
    maxMessageContentChars: BOUNDED_MESSAGE_CONTENT_LENGTH,
    messageHeadCount,
    messageTailCount
  });

  return createReadResult({
    data:
      result.data ??
      emptyBoundedStateDbMessages({
        messageHeadCount,
        messageTailCount
      }),
    issues: result.issues
  });
}

export function readMessagingSessionsResult(agentRootPath: string): ReadResult<MessagingSessionRecord[]> {
  const sessionsPath = path.join(agentRootPath, 'sessions', 'sessions.json');

  if (!fs.existsSync(sessionsPath)) {
    return createReadResult({
      data: []
    });
  }

  try {
    return createReadResult({
      data: parseMessagingSessionIndex(fs.readFileSync(sessionsPath, 'utf8'))
    });
  } catch (error) {
    const issueFactory =
      error instanceof SyntaxError || error instanceof ZodError ? createParseFailedIssue : createUnreadablePathIssue;

    return createReadResult({
      data: [],
      issues: [
        issueFactory({
          id: 'sessions-messaging-index-failed',
          summary: 'Messaging session index could not be read',
          detail: error instanceof Error ? error.message : 'Hermes Console could not read the messaging session index.',
          path: sessionsPath
        })
      ]
    });
  }
}

export function readMessagingSessions(agentRootPath: string): MessagingSessionRecord[] {
  return readMessagingSessionsResult(agentRootPath).data;
}
