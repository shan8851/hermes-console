import path from 'node:path';

import { readHermesInstallationResult } from '@/features/inventory/read-installation';
import { readTextFileResult } from '@/lib/read-text-file-result';
import type { HermesConfigFile, HermesConfigIndex } from '@hermes-console/runtime';

export function readHermesConfig(): HermesConfigIndex {
  const installation = readHermesInstallationResult();
  const files: HermesConfigFile[] = [];

  for (const agent of installation.data.agents) {
    if (!agent.isAvailable) continue;

    const configPath = path.join(agent.rootPath, 'config.yaml');
    const result = readTextFileResult(configPath);

    files.push({
      agentId: agent.id,
      agentLabel: agent.label,
      agentSource: agent.source,
      path: configPath,
      content: result.content ?? null
    });
  }

  return { files };
}
