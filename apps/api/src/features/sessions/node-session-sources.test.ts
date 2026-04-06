import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

const { execFileSyncMock } = vi.hoisted(() => ({
  execFileSyncMock: vi.fn(),
}));

vi.mock("node:child_process", () => ({
  execFileSync: execFileSyncMock,
}));

import {
  readStateDbMessagesResult,
  readStateDbSessionsResult,
} from "@/features/sessions/node-session-sources";

describe("readStateDbSessionsResult", () => {
  afterEach(() => {
    execFileSyncMock.mockReset();
  });

  it("surfaces missing Python as a missing dependency issue", () => {
    const agentRoot = fs.mkdtempSync(path.join(os.tmpdir(), "hermes-console-sessions-"));
    fs.writeFileSync(path.join(agentRoot, "state.db"), "");
    const error = new Error("python3 missing");

    Object.assign(error, { code: "ENOENT" });
    execFileSyncMock.mockImplementation(() => {
      throw error;
    });

    const result = readStateDbSessionsResult(agentRoot);

    expect(result.data).toEqual([]);
    expect(result.issues[0]?.code).toBe("missing_dependency");
  });

  it("surfaces malformed SQLite bridge payloads as parse failures", () => {
    const agentRoot = fs.mkdtempSync(path.join(os.tmpdir(), "hermes-console-sessions-"));
    fs.writeFileSync(path.join(agentRoot, "state.db"), "");
    execFileSyncMock.mockReturnValueOnce(
      JSON.stringify([{ id: "session-1" }]),
    );

    const result = readStateDbSessionsResult(agentRoot);

    expect(result.data).toEqual([]);
    expect(result.issues[0]?.code).toBe("parse_failed");
  });

  it("drops invalid session rows but keeps valid rows with a compact parse issue", () => {
    const agentRoot = fs.mkdtempSync(path.join(os.tmpdir(), "hermes-console-sessions-"));
    fs.writeFileSync(path.join(agentRoot, "state.db"), "");
    execFileSyncMock.mockReturnValueOnce(
      JSON.stringify([
        {
          id: "session-1",
          source: "cli",
          userId: null,
          model: null,
          parentSessionId: null,
          startedAt: "2025-01-01T00:00:00Z",
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
          title: null,
        },
        {
          id: "session-2",
          source: "cli",
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
          title: null,
        },
      ]),
    );

    const result = readStateDbSessionsResult(agentRoot);

    expect(result.data).toHaveLength(1);
    expect(result.data[0]?.id).toBe("session-1");
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0]?.code).toBe("parse_failed");
    expect(result.issues[0]?.detail).toBe(
      "Dropped 1 invalid session row. First error: startedAt expected string, received null.",
    );
  });

  it("drops invalid message rows but keeps valid rows with a compact parse issue", () => {
    const agentRoot = fs.mkdtempSync(path.join(os.tmpdir(), "hermes-console-sessions-"));
    fs.writeFileSync(path.join(agentRoot, "state.db"), "");
    execFileSyncMock.mockReturnValueOnce(
      JSON.stringify([
        {
          id: 1,
          sessionId: "session-1",
          role: "assistant",
          content: "hello",
          toolName: null,
          timestamp: "2025-01-01T00:00:00Z",
          tokenCount: 12,
        },
        {
          id: 2,
          sessionId: "session-1",
          role: "assistant",
          content: "broken",
          toolName: null,
          timestamp: null,
          tokenCount: 12,
        },
      ]),
    );

    const result = readStateDbMessagesResult({
      agentRootPath: agentRoot,
      sessionId: "session-1",
    });

    expect(result.data).toHaveLength(1);
    expect(result.data[0]?.id).toBe(1);
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0]?.detail).toBe(
      "Dropped 1 invalid message row. First error: timestamp expected string, received null.",
    );
    expect(result.issues[0]?.detail).not.toContain("[");
    expect(result.issues[0]?.detail).not.toContain("path");
  });
});
