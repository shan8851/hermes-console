import type { HermesAgentIdentity } from '@hermes-console/runtime';

export const ALL_PROFILES_SCOPE = 'all' as const;

export type ProfileScopeId = typeof ALL_PROFILES_SCOPE | string;

export type ProfileScopedEntity = {
  agentId: string;
};

const PROFILE_SCOPED_PATHS = new Set([
  '/',
  '/sessions',
  '/cron',
  '/usage',
  '/logs',
  '/skills',
  '/memory',
  '/files',
  '/config'
]);

export const normalizeProfileScope = (value: string | null | undefined): ProfileScopeId =>
  value == null || value.trim() === '' ? ALL_PROFILES_SCOPE : value;

export const isAllProfilesScope = (scope: ProfileScopeId): boolean => scope === ALL_PROFILES_SCOPE;

export const findSelectedProfile = ({
  agents,
  scope
}: {
  agents: HermesAgentIdentity[];
  scope: ProfileScopeId;
}): HermesAgentIdentity | null => {
  if (isAllProfilesScope(scope)) {
    return null;
  }

  return agents.find((agent) => agent.id === scope) ?? null;
};

export const resolveProfileScope = ({
  agents,
  value
}: {
  agents: HermesAgentIdentity[];
  value: string | null | undefined;
}): ProfileScopeId => {
  const normalizedScope = normalizeProfileScope(value);

  if (isAllProfilesScope(normalizedScope)) {
    return ALL_PROFILES_SCOPE;
  }

  return agents.some((agent) => agent.id === normalizedScope) ? normalizedScope : ALL_PROFILES_SCOPE;
};

export const resolveProfileScopeFromIds = ({
  profileIds,
  value
}: {
  profileIds: string[];
  value: string | null | undefined;
}): ProfileScopeId => {
  const normalizedScope = normalizeProfileScope(value);

  if (isAllProfilesScope(normalizedScope)) {
    return ALL_PROFILES_SCOPE;
  }

  return profileIds.includes(normalizedScope) ? normalizedScope : ALL_PROFILES_SCOPE;
};

export const getProfileScopeLabel = ({
  agents,
  scope
}: {
  agents: HermesAgentIdentity[];
  scope: ProfileScopeId;
}): string => {
  if (isAllProfilesScope(scope)) {
    return 'All profiles';
  }

  const selectedProfile = findSelectedProfile({ agents, scope });

  if (selectedProfile?.id === 'default') {
    return 'Default profile';
  }

  return selectedProfile?.label ?? 'All profiles';
};

export const createProfileScopeOptions = (
  agents: HermesAgentIdentity[]
): Array<{ value: ProfileScopeId; label: string }> => [
  {
    value: ALL_PROFILES_SCOPE,
    label: 'All profiles'
  },
  ...agents.map((agent) => ({
    value: agent.id,
    label: agent.id === 'default' ? 'Default profile' : agent.label
  }))
];

export const filterByProfileScope = <Entity extends ProfileScopedEntity>({
  items,
  scope
}: {
  items: Entity[];
  scope: ProfileScopeId;
}): Entity[] => (isAllProfilesScope(scope) ? items : items.filter((item) => item.agentId === scope));

export const routeSupportsProfileScope = (pathname: string): boolean => PROFILE_SCOPED_PATHS.has(pathname);

export const readProfileScopeFromSearch = ({
  pathname,
  search
}: {
  pathname: string;
  search: Record<string, unknown>;
}): ProfileScopeId => {
  const profile = typeof search.profile === 'string' ? search.profile : null;
  const legacyAgent = pathname === '/sessions' && typeof search.agent === 'string' ? search.agent : null;

  return normalizeProfileScope(profile ?? legacyAgent);
};

export const createProfileSearch = ({
  currentSearch,
  scope
}: {
  currentSearch?: Record<string, unknown>;
  scope: ProfileScopeId;
}): Record<string, unknown> => {
  const remainingSearch = Object.fromEntries(
    Object.entries(currentSearch ?? {}).filter(([key]) => key !== 'agent' && key !== 'profile')
  );

  if (isAllProfilesScope(scope)) {
    return remainingSearch;
  }

  return {
    ...remainingSearch,
    profile: scope
  };
};
