import { afterEach, describe, expect, it, vi } from "vitest";

describe("readHermesBinaryPath", () => {
  afterEach(() => {
    delete process.env.HERMES_CONSOLE_HERMES_BIN;
    vi.resetModules();
  });

  it("reads the Hermes binary override at call time instead of import time", async () => {
    const module = await import("@/features/runtime-overview/hermes-cli-diagnostics");

    process.env.HERMES_CONSOLE_HERMES_BIN = "/tmp/custom-hermes";

    expect(module.readHermesBinaryPath()).toBe("/tmp/custom-hermes");
  });
});
