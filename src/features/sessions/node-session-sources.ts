import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

import type {
  AgentSessionMessageRecord,
  AgentStateSessionRecord,
  MessagingSessionRecord,
} from "@/features/sessions/types";
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

function runSqliteJsonQuery<T>(dbPath: string, mode: "sessions" | "messages", sessionId?: string): T[] {
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
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

export function readStateDbSessions(agentRootPath: string): AgentStateSessionRecord[] {
  const dbPath = path.join(agentRootPath, "state.db");

  if (!fs.existsSync(dbPath)) {
    return [];
  }

  return runSqliteJsonQuery<AgentStateSessionRecord>(dbPath, "sessions").filter(
    (record) => typeof record.id === "string" && typeof record.startedAt === "string",
  );
}

export function readStateDbMessages({
  agentRootPath,
  sessionId,
}: {
  agentRootPath: string;
  sessionId: string;
}): AgentSessionMessageRecord[] {
  const dbPath = path.join(agentRootPath, "state.db");

  if (!fs.existsSync(dbPath)) {
    return [];
  }

  return runSqliteJsonQuery<AgentSessionMessageRecord>(dbPath, "messages", sessionId).filter(
    (record) => typeof record.id === "number" && typeof record.sessionId === "string",
  );
}

export function readMessagingSessions(agentRootPath: string): MessagingSessionRecord[] {
  const sessionsPath = path.join(agentRootPath, "sessions", "sessions.json");

  if (!fs.existsSync(sessionsPath)) {
    return [];
  }

  try {
    return parseMessagingSessionIndex(fs.readFileSync(sessionsPath, "utf8"));
  } catch {
    return [];
  }
}
