import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { readSkillsIndex, type SkillsFileSystem } from '@/features/skills/read-skills-index';

function createFileSystem(files: Record<string, string>): SkillsFileSystem {
  const directories = new Set<string>();

  for (const filePath of Object.keys(files)) {
    let currentPath = path.dirname(filePath);
    while (currentPath && currentPath !== '.') {
      directories.add(currentPath);
      const parentPath = path.dirname(currentPath);
      if (parentPath === currentPath) {
        break;
      }
      currentPath = parentPath;
    }
  }

  return {
    pathExists(targetPath) {
      return directories.has(targetPath) || Object.hasOwn(files, targetPath);
    },
    listDirectories(targetPath) {
      return Array.from(directories)
        .filter((directory) => path.dirname(directory) === targetPath)
        .map((directory) => path.basename(directory))
        .sort((left, right) => left.localeCompare(right));
    },
    listFiles(targetPath) {
      return Object.keys(files)
        .filter((filePath) => path.dirname(filePath) === targetPath)
        .map((filePath) => path.basename(filePath))
        .sort((left, right) => left.localeCompare(right));
    },
    readTextFile(targetPath) {
      return files[targetPath] ?? null;
    }
  };
}

describe('readSkillsIndex', () => {
  it('derives readiness, tags, platform status, and linked-file counts from skill metadata', () => {
    const skillsRoot = '/tmp/hermes/skills';
    const fileSystem = createFileSystem({
      [`${skillsRoot}/media/gif-search/SKILL.md`]: [
        '---',
        'name: gif-search',
        'description: Search GIFs',
        'platforms: [linux]',
        'required_environment_variables:',
        '  - name: TENOR_API_KEY',
        'metadata:',
        '  hermes:',
        '    tags: [gif, media]',
        '    category: media',
        '    requires_toolsets: [terminal]',
        '---',
        '',
        'Body'
      ].join('\n'),
      [`${skillsRoot}/media/gif-search/references/setup.md`]: 'setup'
    });

    const result = readSkillsIndex({
      context: {
        currentPlatform: 'linux',
        envKeys: new Set(['TENOR_API_KEY'])
      },
      fileSystem,
      profileId: 'default',
      skillsRoot
    });

    expect(result.skills[0]).toMatchObject({
      category: 'media',
      profileId: 'default',
      tags: ['gif', 'media'],
      readiness: {
        status: 'unknown',
        linkedFileCount: 1,
        linkedFilesByKind: {
          reference: 1
        },
        platform: {
          status: 'compatible'
        },
        requirements: [
          {
            kind: 'env',
            name: 'TENOR_API_KEY',
            required: true,
            status: 'present'
          },
          {
            kind: 'toolset',
            name: 'terminal',
            required: true,
            status: 'unknown'
          }
        ]
      }
    });
  });

  it('reports setup needed, unsupported, and parse issue states without guessing availability', () => {
    const skillsRoot = '/tmp/hermes/skills';
    const fileSystem = createFileSystem({
      [`${skillsRoot}/api/needing-env/SKILL.md`]: [
        '---',
        'name: needing-env',
        'description: Needs env',
        'required_environment_variables:',
        '  - name: SERVICE_TOKEN',
        '---',
        ''
      ].join('\n'),
      [`${skillsRoot}/apple/macos-only/SKILL.md`]: [
        '---',
        'name: macos-only',
        'description: macOS only',
        'platforms: [macos]',
        '---',
        ''
      ].join('\n'),
      [`${skillsRoot}/broken/SKILL.md`]: 'No frontmatter'
    });

    const result = readSkillsIndex({
      context: {
        currentPlatform: 'linux',
        envKeys: new Set()
      },
      fileSystem,
      skillsRoot
    });

    expect(Object.fromEntries(result.skills.map((skill) => [skill.slug, skill.readiness.status]))).toEqual({
      broken: 'parse_issue',
      'macos-only': 'unsupported',
      'needing-env': 'setup_needed'
    });
  });
});
