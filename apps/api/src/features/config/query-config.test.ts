import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { readHermesConfigQuery } from '@/features/config/query-config';

const previousHermesRoot = process.env.HERMES_CONSOLE_HERMES_DIR;

const createHermesRoot = () => fs.mkdtempSync(path.join(os.tmpdir(), 'hermes-console-config-'));

describe('readHermesConfigQuery', () => {
  afterEach(() => {
    if (previousHermesRoot == null) {
      delete process.env.HERMES_CONSOLE_HERMES_DIR;
      return;
    }

    process.env.HERMES_CONSOLE_HERMES_DIR = previousHermesRoot;
  });

  it('returns partial when one discovered agent has a readable config and another is missing it', () => {
    const hermesRoot = createHermesRoot();
    const alphaRoot = path.join(hermesRoot, 'profiles', 'alpha');

    fs.mkdirSync(path.join(alphaRoot, 'sessions'), { recursive: true });
    fs.writeFileSync(path.join(hermesRoot, 'config.yaml'), 'model:\n  default: gpt-5.4\n');
    process.env.HERMES_CONSOLE_HERMES_DIR = hermesRoot;

    const result = readHermesConfigQuery();
    const defaultFile = result.data.files.find((file) => file.agentId === 'default');
    const alphaFile = result.data.files.find((file) => file.agentId === 'alpha');
    const missingIssue = result.issues.find((issue) => issue.id === 'config-missing:alpha');

    expect(result.status).toBe('partial');
    expect(defaultFile?.readStatus).toBe('ready');
    expect(alphaFile?.readStatus).toBe('missing');
    expect(missingIssue?.summary).toBe('alpha config is missing');
  });

  it('returns partial when an agent config is unreadable but at least one other config is readable', () => {
    const hermesRoot = createHermesRoot();
    const alphaRoot = path.join(hermesRoot, 'profiles', 'alpha');

    fs.mkdirSync(path.join(alphaRoot, 'config.yaml'), { recursive: true });
    fs.writeFileSync(path.join(hermesRoot, 'config.yaml'), 'model:\n  default: gpt-5.4\n');
    process.env.HERMES_CONSOLE_HERMES_DIR = hermesRoot;

    const result = readHermesConfigQuery();
    const alphaFile = result.data.files.find((file) => file.agentId === 'alpha');
    const unreadableIssue = result.issues.find((issue) => issue.id === 'config-unreadable:alpha');

    expect(result.status).toBe('partial');
    expect(alphaFile?.readStatus).toBe('unreadable');
    expect(alphaFile?.readDetail).toContain('EISDIR');
    expect(unreadableIssue?.summary).toBe('alpha config is unreadable');
  });

  it('returns missing when no readable config exists for any discovered agent', () => {
    const hermesRoot = createHermesRoot();
    const alphaRoot = path.join(hermesRoot, 'profiles', 'alpha');

    fs.mkdirSync(path.join(alphaRoot, 'sessions'), { recursive: true });
    process.env.HERMES_CONSOLE_HERMES_DIR = hermesRoot;

    const result = readHermesConfigQuery();
    const alphaFile = result.data.files.find((file) => file.agentId === 'alpha');

    expect(result.status).toBe('missing');
    expect(alphaFile?.readStatus).toBe('missing');
    expect(result.issues.some((issue) => issue.id === 'config-missing:alpha')).toBe(true);
  });
});
