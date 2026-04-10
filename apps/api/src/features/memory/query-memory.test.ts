import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { readHermesMemoryQuery } from '@/features/memory/query-memory';

describe('readHermesMemoryQuery', () => {
  const originalHermesRoot = process.env.HERMES_CONSOLE_HERMES_DIR;

  afterEach(() => {
    if (originalHermesRoot == null) {
      delete process.env.HERMES_CONSOLE_HERMES_DIR;
      return;
    }

    process.env.HERMES_CONSOLE_HERMES_DIR = originalHermesRoot;
  });

  it('aggregates memory data across the default agent and profiles', () => {
    const hermesRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'hermes-console-memory-'));
    const alphaRoot = path.join(hermesRoot, 'profiles', 'alpha');

    fs.mkdirSync(path.join(hermesRoot, 'memories'), { recursive: true });
    fs.mkdirSync(path.join(alphaRoot, 'memories'), { recursive: true });
    fs.writeFileSync(path.join(hermesRoot, 'memories', 'MEMORY.md'), '# MEMORY.md\n\n§\nRoot block');
    fs.writeFileSync(path.join(hermesRoot, 'memories', 'USER.md'), 'Root user');
    fs.writeFileSync(path.join(alphaRoot, 'memories', 'MEMORY.md'), 'Alpha block');
    process.env.HERMES_CONSOLE_HERMES_DIR = hermesRoot;

    const result = readHermesMemoryQuery();
    const defaultAgent = result.data.agents.find((agent) => agent.agentId === 'default');
    const alphaAgent = result.data.agents.find((agent) => agent.agentId === 'alpha');
    const partialIssue = result.issues.find((issue) => issue.id === 'memory-partial:alpha');

    expect(result.data.agentCount).toBe(2);
    expect(result.data.agentsWithMemory).toBe(2);
    expect(defaultAgent?.status).toBe('ready');
    expect(alphaAgent?.status).toBe('partial');
    expect(partialIssue?.summary).toBe('alpha memory is partial');
  });
});
