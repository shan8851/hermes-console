import path from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import { readMemoryFiles, type MemoryFileSystem } from '@/features/memory/read-memory-files';

function createFileSystem({
  files,
  modifiedTimes = {}
}: {
  files: Record<string, string>;
  modifiedTimes?: Record<string, number>;
}): MemoryFileSystem {
  return {
    pathExists(targetPath) {
      return Object.hasOwn(files, targetPath);
    },
    getLastModifiedMs(targetPath) {
      return modifiedTimes[targetPath] ?? null;
    },
    readTextFile(targetPath) {
      return files[targetPath] ?? null;
    }
  };
}

describe('readMemoryFiles', () => {
  it('derives pressure, latest modified time, and provider setup posture without exposing env values', () => {
    const hermesRoot = '/tmp/hermes';
    const memoryPath = path.join(hermesRoot, 'memories', 'MEMORY.md');
    const userPath = path.join(hermesRoot, 'memories', 'USER.md');
    const result = readMemoryFiles({
      hermesRoot,
      fileSystem: createFileSystem({
        files: {
          [path.join(hermesRoot, 'config.yaml')]: [
            'memory:',
            '  memory_char_limit: 10',
            '  user_char_limit: 100',
            '  provider: honcho'
          ].join('\n'),
          [path.join(hermesRoot, '.env')]: 'HONCHO_API_KEY=secret-value\n',
          [memoryPath]: '1234567890',
          [userPath]: 'User note'
        },
        modifiedTimes: {
          [memoryPath]: 1_700_000_000_000,
          [userPath]: 1_710_000_000_000
        }
      })
    });

    expect(result.statusSummary).toMatchObject({
      latestModifiedMs: 1_710_000_000_000,
      level: 'pressured'
    });
    expect(result.provider).toMatchObject({
      configuredProvider: 'honcho',
      name: 'honcho',
      status: 'configured',
      requirements: [
        {
          envVar: 'HONCHO_API_KEY',
          required: true,
          status: 'present'
        }
      ]
    });
    expect(JSON.stringify(result.provider)).not.toContain('secret-value');
  });

  it('labels existing quiet memory as stale after 90 days', () => {
    const now = new Date('2026-05-12T12:00:00.000Z');
    vi.useFakeTimers();
    vi.setSystemTime(now);

    try {
      const hermesRoot = '/tmp/hermes';
      const staleTime = now.getTime() - 91 * 24 * 60 * 60 * 1000;
      const memoryPath = path.join(hermesRoot, 'memories', 'MEMORY.md');
      const userPath = path.join(hermesRoot, 'memories', 'USER.md');
      const result = readMemoryFiles({
        hermesRoot,
        fileSystem: createFileSystem({
          files: {
            [memoryPath]: 'Memory note',
            [userPath]: 'User note'
          },
          modifiedTimes: {
            [memoryPath]: staleTime,
            [userPath]: staleTime
          }
        })
      });

      expect(result.statusSummary).toMatchObject({
        level: 'stale',
        staleAfterDays: 90
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it('reports configured providers with missing required setup explicitly', () => {
    const previousSupermemoryApiKey = process.env.SUPERMEMORY_API_KEY;
    delete process.env.SUPERMEMORY_API_KEY;
    const hermesRoot = '/tmp/hermes';

    try {
      const result = readMemoryFiles({
        hermesRoot,
        fileSystem: createFileSystem({
          files: {
            [path.join(hermesRoot, 'config.yaml')]: ['memory:', '  provider: supermemory'].join('\n'),
            [path.join(hermesRoot, 'memories', 'MEMORY.md')]: 'Memory note',
            [path.join(hermesRoot, 'memories', 'USER.md')]: 'User note'
          }
        })
      });

      expect(result.provider).toMatchObject({
        configuredProvider: 'supermemory',
        status: 'setup_needed',
        requirements: [
          {
            envVar: 'SUPERMEMORY_API_KEY',
            required: true,
            status: 'missing'
          }
        ]
      });
    } finally {
      if (previousSupermemoryApiKey == null) {
        delete process.env.SUPERMEMORY_API_KEY;
      } else {
        process.env.SUPERMEMORY_API_KEY = previousSupermemoryApiKey;
      }
    }
  });
});
