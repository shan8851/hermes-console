import { useQuery } from '@tanstack/react-query';
import { useRouter, useRouterState } from '@tanstack/react-router';

import { AppSelect } from '@/components/ui/app-select';
import { inventoryQueryOptions } from '@/lib/api';
import {
  ALL_PROFILES_SCOPE,
  createProfileScopeOptions,
  createProfileSearch,
  readProfileScopeFromSearch,
  resolveProfileScope,
  routeSupportsProfileScope,
  type ProfileScopeId
} from '@/features/profile-scope/profile-scope';

export const ProfileScopeSelector = ({
  fallbackProfileScope,
  onFallbackProfileScopeChange
}: {
  fallbackProfileScope: ProfileScopeId;
  onFallbackProfileScopeChange: (scope: ProfileScopeId) => void;
}) => {
  const router = useRouter();
  const location = useRouterState({
    select: (state) => state.location
  });
  const inventoryQuery = useQuery({
    ...inventoryQueryOptions(),
    refetchOnMount: false,
    retry: false,
    staleTime: 60_000
  });
  const agents = inventoryQuery.data?.data.agents ?? [];
  const supportsProfileScope = routeSupportsProfileScope(location.pathname);
  const routeProfileScope = readProfileScopeFromSearch({
    pathname: location.pathname,
    search: location.search as Record<string, unknown>
  });
  const selectedScope = resolveProfileScope({
    agents,
    value: supportsProfileScope ? routeProfileScope : fallbackProfileScope
  });
  const options = createProfileScopeOptions(agents);
  const effectiveOptions =
    options.length > 1
      ? options
      : [
          {
            value: ALL_PROFILES_SCOPE,
            label: 'All profiles'
          }
        ];

  return (
    <AppSelect
      value={selectedScope}
      onChange={(value) => {
        const nextScope = resolveProfileScope({
          agents,
          value
        });

        onFallbackProfileScopeChange(nextScope);

        if (!supportsProfileScope) {
          return;
        }

        void router.navigate({
          to: location.pathname,
          search: createProfileSearch({
            currentSearch: location.search as Record<string, unknown>,
            scope: nextScope
          })
        });
      }}
      options={effectiveOptions}
      ariaLabel={supportsProfileScope ? 'Select profile scope' : 'Select fallback profile scope for scoped pages'}
      className="min-w-[10.5rem] max-w-[14rem] shrink-0"
    />
  );
};
