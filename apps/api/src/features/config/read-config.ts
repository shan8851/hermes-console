import path from 'node:path';

import { resolveInventoryPathConfigFromEnv } from '@/features/inventory/resolve-path-config';
import { readTextFileResult } from '@/lib/read-text-file-result';
import type { HermesConfigEntry, HermesConfigIndex, HermesConfigSource } from '@hermes-console/runtime';

const MASK = '••••••';

function maskEnvContent(raw: string): string {
  return raw.replace(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*=)(.*)$/gm, (_, prefix) => `${prefix}${MASK}`);
}

function parseYamlEntries(raw: string): HermesConfigEntry[] {
  const entries: HermesConfigEntry[] = [];
  let currentSection: string | null = null;
  const stack: string[] = [];

  for (const rawLine of raw.replace(/\r\n/g, '\n').split('\n')) {
    const line = rawLine.replace(/\t/g, '    ');
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('#')) continue;

    const indent = line.match(/^\s*/)?.[0].length ?? 0;
    const depth = Math.floor(indent / 2);
    const match = trimmed.match(/^([A-Za-z0-9_.-]+):\s*(.*)$/);

    if (!match) continue;

    const key = match[1];
    if (!key) continue;

    stack.length = depth;
    stack[depth] = key;

    // Track top-level sections
    if (depth === 0) {
      currentSection = key;
    }

    if (match[2]) {
      const fullKey = stack.slice(0, depth + 1).join('.');
      let value = match[2].trim().replace(/^['"]|['"]$/g, '');

      // Handle inline arrays: [a, b, c]
      if (value.startsWith('[')) {
        value = match[2].trim(); // keep brackets
      }

      entries.push({
        key: fullKey,
        value,
        source: 'config.yaml' as HermesConfigSource,
        masked: false,
        section: currentSection
      });
    }
  }

  return entries;
}

function parseEnvEntries(raw: string): HermesConfigEntry[] {
  const entries: HermesConfigEntry[] = [];

  for (const rawLine of raw.replace(/\r\n/g, '\n').split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const match = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match || !match[1]) continue;

    entries.push({
      key: match[1],
      value: MASK,
      source: '.env' as HermesConfigSource,
      masked: true,
      section: null
    });
  }

  return entries;
}

export function readHermesConfig(): HermesConfigIndex {
  const paths = resolveInventoryPathConfigFromEnv();
  const hermesRoot = paths.hermesRoot.path;
  const configPath = path.join(hermesRoot, 'config.yaml');
  const envPath = path.join(hermesRoot, '.env');

  const configResult = readTextFileResult(configPath);
  const envResult = readTextFileResult(envPath);

  const rawConfig = configResult.content ?? null;
  const rawEnv = envResult.content ? maskEnvContent(envResult.content) : null;

  const configEntries = rawConfig ? parseYamlEntries(rawConfig) : [];
  const envEntries = envResult.content ? parseEnvEntries(envResult.content) : [];

  return {
    entries: [...configEntries, ...envEntries],
    rawConfig,
    rawEnv,
    configPath,
    envPath
  };
}
