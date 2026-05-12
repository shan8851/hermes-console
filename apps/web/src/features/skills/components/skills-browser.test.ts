import { describe, expect, it } from 'vitest';

import { filterSkills } from '@/features/skills/components/skills-browser';
import type { SkillSummary } from '@hermes-console/runtime';

const createSkill = ({
  id,
  profileId,
  readiness,
  source
}: {
  id: string;
  profileId: string;
  readiness: SkillSummary['readiness']['status'];
  source: SkillSummary['source']['kind'];
}): SkillSummary => ({
  id,
  slug: id,
  name: id,
  description: `${id} description`,
  category: source === 'external' ? 'shared' : 'workspace',
  tags: [readiness],
  profileId,
  source: {
    agentId: profileId,
    kind: source,
    label: profileId,
    rootPath: `/tmp/${profileId}/skills`
  },
  skillPath: `${id}/SKILL.md`,
  parseStatus: readiness === 'parse_issue' ? 'malformed' : 'valid',
  readiness: {
    status: readiness,
    reasons: [],
    platform: {
      currentPlatform: 'linux',
      platforms: [],
      status: 'compatible'
    },
    requirements: [],
    linkedFileCount: 0,
    linkedFilesByKind: {
      asset: 0,
      reference: 0,
      script: 0,
      template: 0
    }
  },
  linkedFiles: []
});

describe('filterSkills', () => {
  it('filters by readiness, source, category, profile, and search text', () => {
    const skills = [
      createSkill({
        id: 'local-ready',
        profileId: 'default',
        readiness: 'available',
        source: 'root'
      }),
      createSkill({
        id: 'profile-setup',
        profileId: 'nigel',
        readiness: 'setup_needed',
        source: 'profile'
      }),
      createSkill({
        id: 'shared-ready',
        profileId: 'nigel',
        readiness: 'available',
        source: 'external'
      })
    ];

    expect(
      filterSkills({
        category: 'shared',
        profile: 'nigel',
        query: 'ready',
        readiness: 'available',
        skills,
        source: 'external'
      }).map((skill) => skill.id)
    ).toEqual(['shared-ready']);
  });
});
