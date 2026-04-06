import { describe, expect, it } from "vitest";

import {
  parseEnvAssignments,
  parseGatewayState,
} from "./runtime-artifacts.js";

describe("runtime-artifacts", () => {
  it("parses env assignments with export prefixes and quotes", () => {
    const parsed = parseEnvAssignments(`
      export OPENAI_API_KEY="test-key"
      GITHUB_TOKEN=plain-token
      # ignored
    `);

    expect(parsed.get("OPENAI_API_KEY")).toBe("test-key");
    expect(parsed.get("GITHUB_TOKEN")).toBe("plain-token");
  });

  it("summarizes connected gateway platforms", () => {
    const summary = parseGatewayState(
      JSON.stringify({
        gateway_state: "running",
        updated_at: "2026-04-06T10:00:00Z",
        platforms: {
          discord: { state: "connected" },
          telegram: { state: "disconnected" },
        },
      }),
    );

    expect(summary.state).toBe("running");
    expect(summary.connectedPlatforms).toEqual(["discord"]);
    expect(summary.platformStates.telegram).toBe("disconnected");
  });
});
