import { nodeMemoryFileSystem } from '@/features/memory/node-memory-file-system';
import { readMemoryFiles } from '@/features/memory/read-memory-files';
import { readHermesInstallation } from '@/features/inventory/read-installation';
import { resolveInventoryPathConfigFromEnv } from '@/features/inventory/resolve-path-config';
import { createUnreadablePathIssue } from '@/lib/query-issue-factories';
import { createReadResult } from '@/lib/read-result';
import {
  DEFAULT_MEMORY_CHAR_LIMIT,
  DEFAULT_USER_CHAR_LIMIT,
  type AgentMemoryReadResult,
  type HermesMemoryIndex,
  type MemoryReadResult
} from '@hermes-console/runtime';

function createEmptyMemoryReadResult(hermesRoot: string): MemoryReadResult {
  return {
    status: 'missing',
    rootPath: hermesRoot,
    configPath: `${hermesRoot}/config.yaml`,
    limits: {
      memory: {
        value: DEFAULT_MEMORY_CHAR_LIMIT,
        source: 'default'
      },
      user: {
        value: DEFAULT_USER_CHAR_LIMIT,
        source: 'default'
      }
    },
    files: {
      memory: {
        scope: 'memory',
        label: 'MEMORY',
        filePath: `${hermesRoot}/memories/MEMORY.md`,
        exists: false,
        rawContent: '',
        preamble: '',
        entries: [],
        charCount: 0,
        limit: DEFAULT_MEMORY_CHAR_LIMIT,
        usageRatio: 0,
        usagePercentage: 0,
        pressureLevel: 'healthy'
      },
      user: {
        scope: 'user',
        label: 'USER',
        filePath: `${hermesRoot}/memories/USER.md`,
        exists: false,
        rawContent: '',
        preamble: '',
        entries: [],
        charCount: 0,
        limit: DEFAULT_USER_CHAR_LIMIT,
        usageRatio: 0,
        usagePercentage: 0,
        pressureLevel: 'healthy'
      }
    }
  };
}

function readMemoryResultForRoot(hermesRoot: string) {
  try {
    return createReadResult({
      data: readMemoryFiles({
        hermesRoot,
        fileSystem: nodeMemoryFileSystem
      })
    });
  } catch (error) {
    return createReadResult({
      data: createEmptyMemoryReadResult(hermesRoot),
      issues: [
        createUnreadablePathIssue({
          id: `memory-read-failed:${hermesRoot}`,
          summary: 'Memory files could not be read',
          detail: error instanceof Error ? error.message : 'Hermes Console could not read Hermes memory files.',
          path: hermesRoot
        })
      ]
    });
  }
}

export function readHermesMemoryResult() {
  const paths = resolveInventoryPathConfigFromEnv();
  return readMemoryResultForRoot(paths.hermesRoot.path);
}

export function readHermesMemoryIndexResult() {
  const installation = readHermesInstallation();
  const agentResults = installation.agents.map((agent) => {
    const result = readMemoryResultForRoot(agent.rootPath);

    return {
      data: {
        ...result.data,
        agentId: agent.id,
        agentLabel: agent.label,
        agentSource: agent.source
      } satisfies AgentMemoryReadResult,
      issues: result.issues
    };
  });

  return createReadResult({
    data: {
      agents: agentResults.map((agentResult) => agentResult.data),
      agentCount: agentResults.length,
      agentsWithMemory: agentResults.filter((agentResult) => agentResult.data.status !== 'missing').length
    } satisfies HermesMemoryIndex,
    issues: agentResults.flatMap((agentResult) => agentResult.issues)
  });
}
