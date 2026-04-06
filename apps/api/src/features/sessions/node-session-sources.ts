import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

import { ZodError, z } from "zod";
import {
  createMissingDependencyIssue,
  createParseFailedIssue,
  createUnreadablePathIssue,
} from "@/lib/query-issue-factories";
import { createReadResult, type ReadResult } from "@/lib/read-result";
import type {
  AgentSessionMessageRecord,
  AgentStateSessionRecord,
  HermesQueryIssue,
  MessagingSessionRecord,
} from "@hermes-console/runtime";
import {
  agentSessionMessageRecordSchema,
  agentStateSessionRecordSchema,
} from "@hermes-console/runtime";
import { parseMessagingSessionIndex } from "@/features/sessions/read-sessions";

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
        'toolName': row['tool_name'],
        'timestamp': to_iso(row['timestamp']),
        'tokenCount': row['token_count'],
    }


def main():
    db_path = sys.argv[1]
    mode = sys.argv[2]
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    if mode == 'sessions':
        cur.execute('''
            SELECT
              id,
              source,
              user_id,
              model,
              parent_session_id,
              started_at,
              ended_at,
              end_reason,
              message_count,
              tool_call_count,
              input_tokens,
              output_tokens,
              cache_read_tokens,
              cache_write_tokens,
              reasoning_tokens,
              estimated_cost_usd,
              actual_cost_usd,
              cost_status,
              title
            FROM sessions
            ORDER BY started_at DESC
        ''')
        print(json.dumps([row_to_session(row) for row in cur.fetchall()]))
        return

    if mode == 'messages':
        session_id = sys.argv[3]
        cur.execute('''
            SELECT
              id,
              session_id,
              role,
              content,
              tool_name,
              timestamp,
              token_count
            FROM messages
            WHERE session_id = ?
            ORDER BY timestamp ASC
        ''', (session_id,))
        print(json.dumps([row_to_message(row) for row in cur.fetchall()]))
        return

    raise SystemExit(f'Unsupported mode: {mode}')


if __name__ == '__main__':
    main()
	`;

function formatValidationErrorSummary(error: ZodError): string {
  const firstIssue = error.issues[0];

  if (!firstIssue) {
    return "row had an invalid shape";
  }

  const fieldPath =
    firstIssue.path.length > 0 ? firstIssue.path.join(".") : "value";
  const message = firstIssue.message.replace(/^Invalid input:\s*/i, "");

  return `${fieldPath} ${message}`;
}

function createDroppedRowsIssue({
  dbPath,
  droppedCount,
  mode,
  rowLabel,
  validationError,
}: {
  dbPath: string;
  droppedCount: number;
  mode: "sessions" | "messages";
  rowLabel: "session row" | "message row";
  validationError: ZodError;
}): HermesQueryIssue {
  return createParseFailedIssue({
    id: `sessions-${mode}-invalid-rows`,
    summary: `Dropped invalid ${rowLabel}${droppedCount === 1 ? "" : "s"}`,
    detail: `Dropped ${droppedCount} invalid ${rowLabel}${droppedCount === 1 ? "" : "s"}. First error: ${formatValidationErrorSummary(validationError)}.`,
    path: dbPath,
  });
}

function runSqliteJsonRowsQuery<T>({
  dbPath,
  mode,
  rowLabel,
  rowSchema,
  sessionId,
}: {
  dbPath: string;
  mode: "sessions" | "messages";
  rowLabel: "session row" | "message row";
  rowSchema: z.ZodType<T>;
  sessionId?: string;
}): ReadResult<T[]> {
  try {
    const args = ["-c", SQLITE_SCRIPT, dbPath, mode];

    if (mode === "messages" && sessionId) {
      args.push(sessionId);
    }

    const output = execFileSync("python3", args, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });

    const parsed = JSON.parse(output) as unknown;

    if (!Array.isArray(parsed)) {
      return createReadResult({
        data: [],
        issues: [
          createParseFailedIssue({
            id: `sessions-${mode}-invalid-json-shape`,
            summary: "Session database output had an unexpected shape",
            detail:
              "Hermes Console expected the SQLite bridge to return a JSON array.",
            path: dbPath,
          }),
        ],
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
          validationError: firstValidationError,
        }),
      );
    }

    return createReadResult({
      data: validRows,
      issues,
    });
  } catch (error) {
    const issue =
      error instanceof SyntaxError || error instanceof ZodError
        ? createParseFailedIssue({
            id: `sessions-${mode}-json-parse-failed`,
            summary: "Session database output could not be parsed",
            detail:
              error.message ||
              "Hermes Console could not parse JSON returned from the SQLite bridge.",
            path: dbPath,
          })
        : error &&
            typeof error === "object" &&
            "code" in error &&
            error.code === "ENOENT"
          ? createMissingDependencyIssue({
              id: `sessions-${mode}-sqlite-bridge-missing`,
              summary: "Python runtime is unavailable",
              detail:
                "Hermes Console could not run the Python SQLite bridge needed to inspect session databases.",
              path: "python3",
            })
          : createUnreadablePathIssue({
              id: `sessions-${mode}-sqlite-read-failed`,
              summary: "Session database could not be read",
              detail:
                error instanceof Error
                  ? error.message
                  : "Hermes Console could not read the SQLite-backed session database.",
              path: dbPath,
            });

    return createReadResult({
      data: [],
      issues: [issue],
    });
  }
}

export function readStateDbSessionsResult(
  agentRootPath: string,
): ReadResult<AgentStateSessionRecord[]> {
  const dbPath = path.join(agentRootPath, "state.db");

  if (!fs.existsSync(dbPath)) {
    return createReadResult({
      data: [],
    });
  }

  const result = runSqliteJsonRowsQuery<AgentStateSessionRecord>({
    dbPath,
    mode: "sessions",
    rowLabel: "session row",
    rowSchema: agentStateSessionRecordSchema,
  });

  return createReadResult({
    data: result.data,
    issues: result.issues,
  });
}

export function readStateDbSessions(agentRootPath: string): AgentStateSessionRecord[] {
  return readStateDbSessionsResult(agentRootPath).data;
}

export function readStateDbMessagesResult({
  agentRootPath,
  sessionId,
}: {
  agentRootPath: string;
  sessionId: string;
}): ReadResult<AgentSessionMessageRecord[]> {
  const dbPath = path.join(agentRootPath, "state.db");

  if (!fs.existsSync(dbPath)) {
    return createReadResult({
      data: [],
    });
  }

  return runSqliteJsonRowsQuery<AgentSessionMessageRecord>({
    dbPath,
    mode: "messages",
    rowLabel: "message row",
    rowSchema: agentSessionMessageRecordSchema,
    sessionId,
  });
}

export function readStateDbMessages({
  agentRootPath,
  sessionId,
}: {
  agentRootPath: string;
  sessionId: string;
}): AgentSessionMessageRecord[] {
  return readStateDbMessagesResult({
    agentRootPath,
    sessionId,
  }).data;
}

export function readMessagingSessionsResult(
  agentRootPath: string,
): ReadResult<MessagingSessionRecord[]> {
  const sessionsPath = path.join(agentRootPath, "sessions", "sessions.json");

  if (!fs.existsSync(sessionsPath)) {
    return createReadResult({
      data: [],
    });
  }

  try {
    return createReadResult({
      data: parseMessagingSessionIndex(fs.readFileSync(sessionsPath, "utf8")),
    });
  } catch (error) {
    const issueFactory =
      error instanceof SyntaxError || error instanceof ZodError
        ? createParseFailedIssue
        : createUnreadablePathIssue;

    return createReadResult({
      data: [],
      issues: [
        issueFactory({
          id: "sessions-messaging-index-failed",
          summary: "Messaging session index could not be read",
          detail:
            error instanceof Error
              ? error.message
              : "Hermes Console could not read the messaging session index.",
          path: sessionsPath,
        }),
      ],
    });
  }
}

export function readMessagingSessions(
  agentRootPath: string,
): MessagingSessionRecord[] {
  return readMessagingSessionsResult(agentRootPath).data;
}
