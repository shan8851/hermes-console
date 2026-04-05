import { describe, expect, it } from "vitest";

import {
  composeRuntimeOverview,
  parseChannelDirectory,
  parseConfigPosture,
  parseDoctorOutput,
  parseGatewayState,
  parseStatusOutput,
  parseUpdateStatus,
} from "@/features/runtime-overview/read-runtime-overview";

describe("parseGatewayState", () => {
  it("extracts gateway status and connected platform signal", () => {
    const parsed = parseGatewayState(
      JSON.stringify({
        gateway_state: "running",
        updated_at: "2026-04-03T16:39:27.862408+00:00",
        platforms: {
          telegram: { state: "connected", updated_at: "2026-04-03T16:39:27.861861+00:00" },
          discord: { state: "disconnected", updated_at: "2026-04-03T16:30:00.000000+00:00" },
        },
      }),
    );

    expect(parsed).toMatchObject({
      state: "running",
      connectedPlatforms: ["telegram"],
      platformStates: {
        telegram: "connected",
        discord: "disconnected",
      },
    });
  });

  it("returns an unknown posture for malformed content", () => {
    expect(parseGatewayState("not-json")).toMatchObject({
      state: "unknown",
      connectedPlatforms: [],
    });
  });
});

describe("parseChannelDirectory", () => {
  it("summarises configured platforms and channel counts", () => {
    const parsed = parseChannelDirectory(
      JSON.stringify({
        updated_at: "2026-04-04T23:08:05.977972",
        platforms: {
          discord: [
            { id: "1", type: "channel" },
            { id: "2", type: "thread", thread_id: "2" },
          ],
          telegram: [{ id: "3", type: "dm" }],
          whatsapp: [],
        },
      }),
    );

    expect(parsed).toMatchObject({
      connectedPlatforms: ["discord", "telegram"],
      totalConfiguredEntries: 3,
      platforms: {
        discord: { total: 2, threads: 1 },
        telegram: { total: 1, threads: 0 },
        whatsapp: { total: 0, threads: 0 },
      },
    });
  });
});

describe("parseUpdateStatus", () => {
  it("reports behind counts from update cache", () => {
    expect(parseUpdateStatus('{"ts": 1775300573.8611107, "behind": 47}')).toMatchObject({
      behind: 47,
      status: "behind",
    });
  });

  it("returns unknown when cache is missing or malformed", () => {
    expect(parseUpdateStatus("oops")).toMatchObject({
      behind: null,
      status: "unknown",
    });
  });
});

describe("parseConfigPosture", () => {
  it("pulls the important runtime defaults without becoming a config dump", () => {
    const parsed = parseConfigPosture(`
model:
  default: gpt-5.4
  provider: openai-codex
web:
  backend: exa
tts:
  provider: openai
stt:
  enabled: true
  provider: local
terminal:
  backend: local
compression:
  enabled: true
approvals:
  mode: manual
security:
  redact_secrets: true
  tirith_enabled: true
discord:
  require_mention: false
  auto_thread: false
platform_toolsets:
  telegram: ["hermes-telegram"]
  discord: ["hermes-discord"]
`);

    expect(parsed).toMatchObject({
      model: "gpt-5.4",
      provider: "openai-codex",
      webBackend: "exa",
      ttsProvider: "openai",
      sttProvider: "local",
      terminalBackend: "local",
      approvalsMode: "manual",
      compressionEnabled: true,
      redactSecrets: true,
      tirithEnabled: true,
      discordRequireMention: false,
      discordAutoThread: false,
      configuredPlatforms: ["discord", "telegram"],
    });
  });
});

describe("command snapshot parsing", () => {
  it("parses status output into auth, api, and messaging posture", () => {
    const snapshot = parseStatusOutput(`◆ API Keys\n  OpenRouter    ✓ sk-o...1234\n  GitHub        ✗ (not set)\n\n◆ Auth Providers\n  OpenAI Codex  ✓ logged in\n\n◆ Messaging Platforms\n  Telegram      ✓ configured (home: 1753420146)\n  WhatsApp      ✗ not configured\n\n◆ Gateway Service\n  Status:       ✓ running\n\n◆ Scheduled Jobs\n  Jobs:         10 active, 10 total\n\n◆ Sessions\n  Active:       19 session(s)\n`);

    expect(snapshot.apiKeys[0]).toMatchObject({ name: "OpenRouter", state: "present" });
    expect(snapshot.authProviders[0]).toMatchObject({ name: "OpenAI Codex", state: "logged_in" });
    expect(snapshot.messagingPlatforms[0]).toMatchObject({ name: "Telegram", state: "configured" });
    expect(snapshot.scheduledJobs).toMatchObject({ active: 10, total: 10 });
    expect(snapshot.sessions).toMatchObject({ active: 19 });
  });

  it("parses doctor issues and auth provider warnings", () => {
    const snapshot = parseDoctorOutput(`◆ Auth Providers\n  Nous Portal   ✗ not logged in (run: hermes model)\n\n  Found 2 issue(s) to address:\n\n  1. Browser tools (agent-browser) has 3 npm vulnerability(ies)\n  2. Run 'hermes setup' to configure missing API keys for full tool access\n`);

    expect(snapshot.issueCount).toBe(2);
    expect(snapshot.issues).toHaveLength(2);
    expect(snapshot.authProviders[0]).toMatchObject({ name: "Nous Portal", state: "not_logged_in" });
  });
});

describe("composeRuntimeOverview", () => {
  it("builds a single overview model from runtime, activity, and posture signals", () => {
    const overview = composeRuntimeOverview({
      installation: {
        status: "ready",
        availableAgentCount: 2,
        agents: [{ id: "default" }, { id: "nigel" }],
      },
      gateway: parseGatewayState(
        JSON.stringify({ gateway_state: "running", updated_at: "2026-04-03T16:39:27.862408+00:00", platforms: { telegram: { state: "connected" } } }),
      ),
      channels: parseChannelDirectory(
        JSON.stringify({ updated_at: "2026-04-04T23:08:05.977972", platforms: { telegram: [{ id: "1", type: "dm" }], discord: [{ id: "2", type: "channel" }] } }),
      ),
      update: parseUpdateStatus('{"ts": 1775300573.8611107, "behind": 47}'),
      config: parseConfigPosture(`model:\n  default: gpt-5.4\n  provider: openai-codex\nweb:\n  backend: exa\nterminal:\n  backend: local\ntts:\n  provider: openai\nstt:\n  provider: local\ncompression:\n  enabled: true\napprovals:\n  mode: manual\nsecurity:\n  redact_secrets: true\n  tirith_enabled: true`),
      status: parseStatusOutput(`◆ Auth Providers\n  OpenAI Codex  ✓ logged in\n\n◆ Messaging Platforms\n  Telegram      ✓ configured (home: 1753420146)\n  Discord       ✓ configured\n\n◆ Gateway Service\n  Status:       ✓ running\n`),
      doctor: parseDoctorOutput(`Found 1 issue(s) to address:\n\n1. Browser tools (agent-browser) has 3 npm vulnerability(ies)`),
      envEntries: new Map([["OPENROUTER_API_KEY", "sk-test"], ["EXA_API_KEY", "exa-test"]]),
      memory: {
        files: {
          memory: { pressureLevel: "near_limit" },
          user: { pressureLevel: "healthy" },
        },
      },
      sessions: {
        sessions: [{ id: "s1" }, { id: "s2" }, { id: "s3" }],
      },
      cron: {
        jobs: [
          { statusTone: "healthy", latestOutputState: "silent", attentionLevel: "healthy", overdue: false, failureStreak: 0 },
          { statusTone: "error", latestOutputState: "contentful", attentionLevel: "critical", overdue: true, failureStreak: 2 },
        ],
      },
    });

    expect(overview).toMatchObject({
      installStatus: "ready",
      gatewayState: "running",
      connectedPlatforms: ["discord", "telegram"],
      updateBehind: 47,
      doctorIssueCount: 1,
      activity: {
        sessionCount: 3,
        cronAttentionJobs: 1,
        overdueCronJobs: 1,
        contentfulCronJobs: 1,
        memoryPressure: "near_limit",
      },
      verdict: {
        status: "needs_attention",
      },
    });
    expect(overview.runtimeProfile[0]).toMatchObject({ value: "gpt-5.4", detail: "openai-codex" });
  });
});
