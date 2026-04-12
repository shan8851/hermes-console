import { afterEach, describe, expect, it, vi } from 'vitest';

describe('readHermesBinaryPath', () => {
  afterEach(() => {
    delete process.env.HERMES_CONSOLE_HERMES_BIN;
    vi.resetModules();
  });

  it('reads the Hermes binary override at call time instead of import time', async () => {
    const module = await import('@/features/runtime-overview/hermes-cli-diagnostics');

    process.env.HERMES_CONSOLE_HERMES_BIN = '/tmp/custom-hermes';

    expect(module.readHermesBinaryPath()).toBe('/tmp/custom-hermes');
  });

  it('parses the Hermes CLI version output into structured fields', async () => {
    const module = await import('@/features/runtime-overview/hermes-cli-diagnostics');

    expect(
      module.parseVersionOutput(`Hermes Agent v0.8.0 (2026.4.8)
Project: /home/test/.hermes/hermes-agent
Python: 3.11.14
OpenAI SDK: 2.30.0
Update available: 55 commits behind — run 'hermes update'`)
    ).toEqual({
      version: 'v0.8.0',
      buildDate: '2026.4.8',
      projectPath: '/home/test/.hermes/hermes-agent',
      pythonVersion: '3.11.14',
      openAiSdkVersion: '2.30.0'
    });
  });
});
