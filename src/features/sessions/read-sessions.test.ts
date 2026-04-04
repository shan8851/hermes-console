import { describe, expect, it } from "vitest";

import {
  applyCronJobNames,
  buildSessionDetail,
  combineAgentSessions,
  parseMessagingSessionIndex,
  type AgentSessionMessageRecord,
  type AgentStateSessionRecord,
  type MessagingSessionRecord,
} from "@/features/sessions/read-sessions";

function createStateSession(overrides: Partial<AgentStateSessionRecord> = {}): AgentStateSessionRecord {
  return {
    id: "session-1",
    source: "discord",
    userId: "user-1",
    model: "gpt-5",
    parentSessionId: null,
    startedAt: "2026-04-04T10:00:00.000Z",
    endedAt: "2026-04-04T10:05:00.000Z",
    endReason: "completed",
    messageCount: 12,
    toolCallCount: 3,
    inputTokens: 1000,
    outputTokens: 500,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
    reasoningTokens: 0,
    estimatedCostUsd: 0.12,
    actualCostUsd: null,
    costStatus: "estimated",
    title: "Fix the thing",
    ...overrides,
  };
}

function createMessagingRecord(overrides: Partial<MessagingSessionRecord> = {}): MessagingSessionRecord {
  return {
    sessionKey: "agent:main:discord:thread:123:123:shan",
    sessionId: "session-1",
    createdAt: "2026-04-04T10:00:10.000Z",
    updatedAt: "2026-04-04T10:06:00.000Z",
    displayName: "COOPER_LAND / #projects / hermes-console",
    platform: "discord",
    chatType: "thread",
    totalTokens: 1500,
    estimatedCostUsd: 0,
    costStatus: "unknown",
    memoryFlushed: false,
    origin: {
      platform: "discord",
      chatId: "123",
      chatName: "COOPER_LAND / #projects / hermes-console",
      chatType: "thread",
      userId: "shan",
      userName: "shan8851",
      threadId: "123",
      chatTopic: null,
    },
    ...overrides,
  };
}

describe("parseMessagingSessionIndex", () => {
  it("parses sessions.json object entries into stable records", () => {
    const parsed = parseMessagingSessionIndex(
      JSON.stringify({
        "agent:main:discord:thread:123:123:shan": {
          session_key: "agent:main:discord:thread:123:123:shan",
          session_id: "session-1",
          created_at: "2026-04-04T10:00:10.000Z",
          updated_at: "2026-04-04T10:06:00.000Z",
          display_name: "COOPER_LAND / #projects / hermes-console",
          platform: "discord",
          chat_type: "thread",
          total_tokens: 1500,
          estimated_cost_usd: 0,
          cost_status: "unknown",
          memory_flushed: false,
          origin: {
            platform: "discord",
            chat_id: "123",
            chat_name: "COOPER_LAND / #projects / hermes-console",
            chat_type: "thread",
            user_id: "shan",
            user_name: "shan8851",
            thread_id: "123",
            chat_topic: null,
          },
        },
      }),
    );

    expect(parsed).toEqual([
      expect.objectContaining({
        sessionId: "session-1",
        sessionKey: "agent:main:discord:thread:123:123:shan",
        displayName: "COOPER_LAND / #projects / hermes-console",
        platform: "discord",
        chatType: "thread",
      }),
    ]);
  });

  it("returns an empty list for malformed sessions.json payloads", () => {
    expect(parseMessagingSessionIndex("[]")).toEqual([]);
    expect(parseMessagingSessionIndex("not-json")).toEqual([]);
  });
});

describe("combineAgentSessions", () => {
  it("merges state.db sessions with messaging metadata and sorts by latest activity", () => {
    const summaries = combineAgentSessions({
      agent: {
        id: "default",
        label: "Default",
        rootPath: "/home/shan/.hermes",
        source: "root",
      },
      stateSessions: [
        createStateSession({ id: "session-older", startedAt: "2026-04-03T09:00:00.000Z", endedAt: null, title: null }),
        createStateSession({ id: "session-1" }),
      ],
      messagingSessions: [
        createMessagingRecord({ sessionId: "session-1", updatedAt: "2026-04-04T10:06:00.000Z" }),
        createMessagingRecord({
          sessionId: "session-older",
          updatedAt: "2026-04-03T09:30:00.000Z",
          displayName: "Older thread",
        }),
      ],
    });

    expect(summaries.map((summary) => summary.id)).toEqual(["default:session-1", "default:session-older"]);
    expect(summaries[0]).toMatchObject({
      agentId: "default",
      sessionId: "session-1",
      title: "Fix the thing",
      displayName: "COOPER_LAND / #projects / hermes-console",
      hasMessagingMetadata: true,
      platform: "discord",
      chatType: "thread",
      sourceLabel: "discord thread",
      lastActivityAt: "2026-04-04T10:06:00.000Z",
    });
    expect(summaries[1]).toMatchObject({
      sessionId: "session-older",
      title: "Older thread",
      hasMessagingMetadata: true,
      endedAt: null,
    });
  });

  it("still surfaces sessions with no messaging metadata without lying", () => {
    const summaries = combineAgentSessions({
      agent: {
        id: "nigel",
        label: "nigel",
        rootPath: "/home/shan/.hermes/profiles/nigel",
        source: "profile",
      },
      stateSessions: [
        createStateSession({
          id: "profile-session",
          source: "cli",
          title: null,
          startedAt: "2026-04-04T12:00:00.000Z",
          endedAt: "2026-04-04T12:20:00.000Z",
        }),
      ],
      messagingSessions: [],
    });

    expect(summaries).toEqual([
      expect.objectContaining({
        id: "nigel:profile-session",
        agentId: "nigel",
        title: "profile-session",
        hasMessagingMetadata: false,
        platform: null,
        chatType: null,
        source: "cli",
        sourceLabel: "cli",
      }),
    ]);
  });
});

describe("buildSessionDetail", () => {
  it("falls back to state token totals when messaging totals are zero", () => {
    const summary = combineAgentSessions({
      agent: {
        id: "default",
        label: "Default",
        rootPath: "/home/shan/.hermes",
        source: "root",
      },
      stateSessions: [
        createStateSession({
          inputTokens: 1200,
          outputTokens: 400,
          cacheReadTokens: 30,
          cacheWriteTokens: 20,
        }),
      ],
      messagingSessions: [createMessagingRecord({ totalTokens: 0 })],
    })[0];

    expect(summary.totalTokens).toBe(1650);
  });

  it("applies cron job names onto cron sessions", () => {
    const summary = combineAgentSessions({
      agent: {
        id: "default",
        label: "Default",
        rootPath: "/home/shan/.hermes",
        source: "root",
      },
      stateSessions: [createStateSession({ id: "cron_0e9490927b08_20260404_154506", source: "cron", title: null })],
      messagingSessions: [],
    });

    const enriched = applyCronJobNames({
      sessions: summary,
      cronJobs: [{ id: "0e9490927b08", name: "Cron alert observer -> Discord alerts" }],
    });

    expect(enriched[0]).toMatchObject({
      cronJobId: "0e9490927b08",
      cronJobName: "Cron alert observer -> Discord alerts",
      title: "Cron alert observer -> Discord alerts",
      sourceLabel: "cron",
    });
  });

  it("builds a read-only preview from session messages", () => {
    const detail = buildSessionDetail({
      summary: combineAgentSessions({
        agent: {
          id: "default",
          label: "Default",
          rootPath: "/home/shan/.hermes",
          source: "root",
        },
        stateSessions: [createStateSession()],
        messagingSessions: [createMessagingRecord()],
      })[0],
      messages: [
        {
          id: 1,
          sessionId: "session-1",
          role: "user",
          content: "Can you ship Milestone 4?",
          toolName: null,
          timestamp: "2026-04-04T10:00:00.000Z",
          tokenCount: 15,
        },
        {
          id: 2,
          sessionId: "session-1",
          role: "assistant",
          content: "Yep, working on it.",
          toolName: null,
          timestamp: "2026-04-04T10:00:05.000Z",
          tokenCount: 22,
        },
      ] satisfies AgentSessionMessageRecord[],
    });

    expect(detail.preview).toEqual([
      expect.objectContaining({ role: "user", content: "Can you ship Milestone 4?" }),
      expect.objectContaining({ role: "assistant", content: "Yep, working on it." }),
    ]);
    expect(detail.previewText).toContain("user: Can you ship Milestone 4?");
    expect(detail.previewText).toContain("assistant: Yep, working on it.");
    expect(detail.messageCount).toBe(2);
  });
});
