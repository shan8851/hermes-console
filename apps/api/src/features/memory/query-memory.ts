import path from 'node:path';

import { readHermesInstallationResult } from '@/features/inventory/read-installation';
import { resolveInventoryPathConfigFromEnv } from '@/features/inventory/resolve-path-config';
import { readHermesMemoryIndexResult } from '@/features/memory/read-memory';
import { createHermesQueryResult } from '@hermes-console/runtime';
import type { HermesQueryIssue, HermesQueryResult } from '@hermes-console/runtime';
import type { HermesMemoryIndex } from '@hermes-console/runtime';

export function readHermesMemoryQuery(): HermesQueryResult<HermesMemoryIndex> {
  const capturedAt = new Date().toISOString();
  const installation = readHermesInstallationResult();
  const paths = resolveInventoryPathConfigFromEnv();
  const memory = readHermesMemoryIndexResult();
  const hermesRoot = paths.hermesRoot.path;
  const issues: HermesQueryIssue[] = [...installation.issues, ...memory.issues];
  const agentsWithMemory = memory.data.agents.filter((agent) => agent.status !== 'missing');

  if (!installation.data.hermesRootExists) {
    issues.push({
      id: 'memory-hermes-root-missing',
      code: 'missing_path',
      severity: 'error',
      summary: 'Hermes root not found',
      detail: 'Memory files cannot be read because the configured Hermes root does not exist.',
      path: hermesRoot
    });
  }

  if (agentsWithMemory.length === 0) {
    issues.push({
      id: 'memory-files-missing',
      code: 'missing_path',
      severity: installation.data.hermesRootExists ? 'warning' : 'error',
      summary: 'No memory files found',
      detail: 'Hermes Console did not find MEMORY.md or USER.md under any detected agent root.',
      lookedFor: installation.data.agents.flatMap((agent) => [
        path.join(agent.rootPath, 'memories', 'MEMORY.md'),
        path.join(agent.rootPath, 'memories', 'USER.md')
      ])
    });
  }

  const agentMemoryIssues: HermesQueryIssue[] = memory.data.agents.flatMap<HermesQueryIssue>((agent) => {
    const lookedFor = [
      path.join(agent.rootPath, 'memories', 'MEMORY.md'),
      path.join(agent.rootPath, 'memories', 'USER.md')
    ];

    if (agent.status === 'ready') {
      return [];
    }

    if (agent.status === 'partial') {
      return [
        {
          id: `memory-partial:${agent.agentId}`,
          code: 'missing_path',
          severity: 'warning',
          summary: `${agent.agentLabel} memory is partial`,
          detail: 'One of MEMORY.md or USER.md is missing under this agent root.',
          lookedFor
        }
      ];
    }

    return [
      {
        id: `memory-missing:${agent.agentId}`,
        code: 'missing_path',
        severity: 'info',
        summary: `${agent.agentLabel} has no memory files`,
        detail: 'This agent root does not currently expose MEMORY.md or USER.md.',
        lookedFor
      }
    ];
  });

  issues.push(...agentMemoryIssues);

  return createHermesQueryResult({
    data: memory.data,
    capturedAt,
    status:
      !installation.data.hermesRootExists || agentsWithMemory.length === 0
        ? 'missing'
        : issues.length > 0 || installation.data.status === 'partial'
          ? 'partial'
          : 'ready',
    issues
  });
}
