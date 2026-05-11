import { describe, expect, it } from 'vitest';

import {
  ALL_PROFILES_SCOPE,
  createProfileSearch,
  filterByProfileScope,
  getProfileScopeLabel,
  normalizeProfileScope,
  resolveProfileScopeFromIds,
  resolveProfileScope
} from '@/features/profile-scope/profile-scope';

import type { HermesAgentIdentity } from '@hermes-console/runtime';

const agents: HermesAgentIdentity[] = [
  {
    id: 'default',
    label: 'Default',
    rootPath: '/tmp/hermes',
    source: 'root',
    presence: {
      config: true,
      cron: true,
      memory: true,
      sessions: true,
      skills: true,
      stateDb: true
    },
    isAvailable: true
  },
  {
    id: 'alpha',
    label: 'Alpha',
    rootPath: '/tmp/hermes/profiles/alpha',
    source: 'profile',
    presence: {
      config: true,
      cron: false,
      memory: true,
      sessions: true,
      skills: false,
      stateDb: true
    },
    isAvailable: true
  }
];

describe('profile scope helpers', () => {
  it('normalizes missing and blank values to all profiles', () => {
    expect(normalizeProfileScope(null)).toBe(ALL_PROFILES_SCOPE);
    expect(normalizeProfileScope(undefined)).toBe(ALL_PROFILES_SCOPE);
    expect(normalizeProfileScope('')).toBe(ALL_PROFILES_SCOPE);
    expect(normalizeProfileScope('   ')).toBe(ALL_PROFILES_SCOPE);
  });

  it('keeps a known profile selected', () => {
    expect(resolveProfileScope({ agents, value: 'alpha' })).toBe('alpha');
  });

  it('falls back to all profiles for unknown profiles', () => {
    expect(resolveProfileScope({ agents, value: 'missing' })).toBe(ALL_PROFILES_SCOPE);
    expect(resolveProfileScopeFromIds({ profileIds: ['default', 'alpha'], value: 'missing' })).toBe(ALL_PROFILES_SCOPE);
  });

  it('labels the default profile with product copy', () => {
    expect(getProfileScopeLabel({ agents, scope: 'default' })).toBe('Default profile');
  });

  it('filters scoped entities by agent id', () => {
    const items = [
      { agentId: 'default', value: 1 },
      { agentId: 'alpha', value: 2 }
    ];

    expect(filterByProfileScope({ items, scope: ALL_PROFILES_SCOPE })).toEqual(items);
    expect(filterByProfileScope({ items, scope: 'alpha' })).toEqual([{ agentId: 'alpha', value: 2 }]);
  });

  it('writes profile search params while dropping the legacy agent param', () => {
    expect(createProfileSearch({ currentSearch: { agent: 'default', q: 'session' }, scope: 'alpha' })).toEqual({
      profile: 'alpha',
      q: 'session'
    });
    expect(createProfileSearch({ currentSearch: { agent: 'default', profile: 'alpha' }, scope: 'all' })).toEqual({});
  });
});
