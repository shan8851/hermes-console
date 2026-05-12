import { useQuery } from '@tanstack/react-query';
import { useRouter, useRouterState } from '@tanstack/react-router';
import { Search } from 'lucide-react';
import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';

import {
  filterCommandResults,
  isEditableTarget,
  type CommandResult
} from '@/components/app-shell/app-command-palette-utils';
import { EmptyState } from '@/components/ui/empty-state';
import {
  clearCronFilters,
  createCronHealthSearch,
  hasActiveCronFilters,
  type CronFilterSearch
} from '@/features/cron/lib/cron-filters';
import { useWindowKeydown } from '@/hooks/useWindowKeydown';
import {
  ALL_PROFILES_SCOPE,
  createProfileScopeOptions,
  createProfileSearch,
  isAllProfilesScope,
  readProfileScopeFromSearch,
  resolveProfileScope,
  routeSupportsProfileScope,
  type ProfileScopeId
} from '@/features/profile-scope/profile-scope';
import {
  cronQueryOptions,
  filesQueryOptions,
  inventoryQueryOptions,
  sessionsQueryOptions,
  skillsQueryOptions
} from '@/lib/api';
import { appRoutes } from '@/lib/navigation';
import type { CronHealthState } from '@hermes-console/runtime';

const cronHealthCommandOptions: Array<{
  health: CronHealthState;
  id: string;
  keywords: string[];
  title: string;
}> = [
  {
    health: 'failed-last-run',
    id: 'failed-cron',
    keywords: ['failed cron jobs', 'cron failure', 'last run failed', 'errors'],
    title: 'Show failed cron jobs'
  },
  {
    health: 'delivery-failed',
    id: 'delivery-failures',
    keywords: ['delivery failures', 'delivery failed', 'notification failures', 'cron deliver'],
    title: 'Show delivery failures'
  },
  {
    health: 'overdue',
    id: 'overdue-cron',
    keywords: ['overdue cron jobs', 'late jobs', 'missed schedule', 'needs attention'],
    title: 'Show overdue cron jobs'
  },
  {
    health: 'paused',
    id: 'paused-cron',
    keywords: ['paused cron jobs', 'paused jobs', 'disabled schedule', 'stopped jobs'],
    title: 'Show paused cron jobs'
  },
  {
    health: 'never-observed',
    id: 'never-observed-cron',
    keywords: ['never observed cron jobs', 'no runs', 'unobserved jobs', 'new jobs'],
    title: 'Show never-observed cron jobs'
  }
];

const readSearchString = ({ key, search }: { key: string; search: Record<string, unknown> }): string | undefined =>
  typeof search[key] === 'string' ? search[key] : undefined;

export function AppCommandPalette({
  fallbackProfileScope,
  isOpen,
  onClose,
  onFallbackProfileScopeChange,
  onOpen
}: {
  fallbackProfileScope: ProfileScopeId;
  isOpen: boolean;
  onClose: () => void;
  onFallbackProfileScopeChange: (scope: ProfileScopeId) => void;
  onOpen: () => void;
}) {
  const router = useRouter();
  const location = useRouterState({
    select: (state) => state.location
  });
  const inputRef = useRef<HTMLInputElement>(null);
  const activeResultRef = useRef<HTMLButtonElement>(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const deferredQuery = useDeferredValue(query);
  const shouldLoad = hasLoaded || isOpen;

  const inventoryQuery = useQuery({
    ...inventoryQueryOptions(),
    enabled: shouldLoad,
    refetchOnMount: false,
    retry: false,
    staleTime: 60_000
  });
  const sessionsQuery = useQuery({
    ...sessionsQueryOptions(),
    enabled: shouldLoad,
    refetchOnMount: false,
    retry: false,
    staleTime: 60_000
  });
  const cronQuery = useQuery({
    ...cronQueryOptions(),
    enabled: shouldLoad,
    refetchOnMount: false,
    retry: false,
    staleTime: 60_000
  });
  const skillsQuery = useQuery({
    ...skillsQueryOptions(),
    enabled: shouldLoad,
    refetchOnMount: false,
    retry: false,
    staleTime: 60_000
  });
  const filesQuery = useQuery({
    ...filesQueryOptions(),
    enabled: shouldLoad,
    refetchOnMount: false,
    retry: false,
    staleTime: 60_000
  });

  useWindowKeydown((event) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      onOpen();
      return;
    }

    if (event.key === 'Escape' && isOpen) {
      event.preventDefault();
      onClose();
      return;
    }

    if (
      event.key === '/' &&
      !event.metaKey &&
      !event.ctrlKey &&
      !event.altKey &&
      !isEditableTarget(event.target) &&
      !isOpen
    ) {
      event.preventDefault();
      onOpen();
    }
  });

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setActiveIndex(0);
      return;
    }

    setHasLoaded(true);
    window.setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    setActiveIndex(0);
  }, [deferredQuery, isOpen]);

  const results = useMemo(() => {
    const agents = inventoryQuery.data?.data.agents ?? [];
    const supportsProfileScope = routeSupportsProfileScope(location.pathname);
    const currentProfileScope = resolveProfileScope({
      agents,
      value: supportsProfileScope
        ? readProfileScopeFromSearch({
            pathname: location.pathname,
            search: location.search as Record<string, unknown>
          })
        : fallbackProfileScope
    });
    const navigateWithProfileScope = ({ scope }: { scope: ProfileScopeId }) => {
      const nextScope = resolveProfileScope({
        agents,
        value: scope
      });

      onFallbackProfileScopeChange(nextScope);
      onClose();

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
    };
    const createSearchForProfileScopedRoute = ({ pathname }: { pathname: string }): Record<string, unknown> =>
      routeSupportsProfileScope(pathname)
        ? createProfileSearch({
            scope: currentProfileScope
          })
        : {};
    const navigateToProfileScopedRoute = ({ pathname }: { pathname: string }) => {
      onClose();
      void router.navigate({
        to: pathname,
        search: createSearchForProfileScopedRoute({
          pathname
        })
      });
    };

    const routeResults: CommandResult[] = appRoutes.map((route) => ({
      id: `route:${route.href}`,
      group: 'Routes',
      title: route.label,
      subtitle: route.description,
      keywords: [route.href, route.label, route.description],
      onSelect: () => {
        const profileSearch = routeSupportsProfileScope(route.href)
          ? createProfileSearch({
              scope: currentProfileScope
            })
          : null;

        onClose();

        if (profileSearch == null) {
          void router.navigate({
            to: route.href
          });
          return;
        }

        void router.navigate({
          to: route.href,
          search: profileSearch
        });
      }
    }));

    const profileResults: CommandResult[] = createProfileScopeOptions(agents).map((option) => ({
      id: `profile:${option.value}`,
      group: 'Profiles',
      title: option.value === ALL_PROFILES_SCOPE ? 'Scope to all profiles' : `Scope to ${option.label}`,
      subtitle:
        option.value === ALL_PROFILES_SCOPE
          ? 'Show aggregate data where supported'
          : (agents.find((agent) => agent.id === option.value)?.rootPath ?? option.label),
      keywords: [
        option.value,
        option.label,
        option.value === ALL_PROFILES_SCOPE ? 'all profiles scope' : 'profile scope'
      ],
      onSelect: () => navigateWithProfileScope({ scope: option.value })
    }));

    const currentSearch = location.search as Record<string, unknown>;
    const profileForCronHealthSearch = isAllProfilesScope(currentProfileScope) ? undefined : currentProfileScope;
    const cronHealthResults: CommandResult[] = cronHealthCommandOptions.map((option) => ({
      id: `operation:cron:${option.id}`,
      group: 'Operations',
      title: option.title,
      subtitle: 'Filter scheduled jobs by operational health',
      keywords: ['cron health', 'scheduled jobs', 'operator shortcut', ...option.keywords],
      onSelect: () => {
        onClose();
        void router.navigate({
          to: '/cron',
          search: createCronHealthSearch({
            health: option.health,
            ...(profileForCronHealthSearch ? { profile: profileForCronHealthSearch } : {})
          })
        });
      }
    }));
    const clearFilterResults: CommandResult[] =
      location.pathname === '/cron' && hasActiveCronFilters(currentSearch as CronFilterSearch)
        ? [
            {
              id: 'operation:clear-filters:cron',
              group: 'Operations',
              title: 'Clear cron filters',
              subtitle: 'Reset cron search and filters while keeping profile scope',
              keywords: ['clear filters', 'reset filters', 'clear cron filters', 'reset cron search'],
              onSelect: () => {
                onClose();
                void router.navigate({
                  to: '/cron',
                  search: clearCronFilters(currentSearch as CronFilterSearch)
                });
              }
            }
          ]
        : location.pathname === '/sessions' && readSearchString({ key: 'q', search: currentSearch })?.trim()
          ? [
              {
                id: 'operation:clear-filters:sessions',
                group: 'Operations',
                title: 'Clear session filters',
                subtitle: 'Reset session search while keeping profile scope',
                keywords: ['clear filters', 'reset filters', 'clear session search', 'reset sessions'],
                onSelect: () => {
                  onClose();
                  void router.navigate({
                    to: '/sessions',
                    search: createProfileSearch({
                      scope: currentProfileScope
                    })
                  });
                }
              }
            ]
          : [];
    const operationResults: CommandResult[] = [
      ...cronHealthResults,
      {
        id: 'operation:logs:errors',
        group: 'Operations',
        title: 'Show recent log errors',
        subtitle: 'Open runtime logs for recent warning and error events',
        keywords: ['recent log errors', 'logs errors warnings', 'runtime errors', 'event timeline'],
        onSelect: () => navigateToProfileScopedRoute({ pathname: '/logs' })
      },
      {
        id: 'operation:sessions:active',
        group: 'Operations',
        title: 'Show active sessions',
        subtitle: 'Open session history in the current profile scope',
        keywords: ['active sessions', 'running sessions', 'still active', 'session history'],
        onSelect: () => navigateToProfileScopedRoute({ pathname: '/sessions' })
      },
      {
        id: 'operation:sessions:recent',
        group: 'Operations',
        title: 'Show recent sessions',
        subtitle: 'Open recent session history in the current profile scope',
        keywords: ['recent sessions', 'latest sessions', 'session history', 'activity history'],
        onSelect: () => navigateToProfileScopedRoute({ pathname: '/sessions' })
      },
      {
        id: 'operation:memory:pressure',
        group: 'Operations',
        title: 'Show memory pressure',
        subtitle: 'Open saved memory and pressure badges',
        keywords: ['memory pressure', 'memory limit', 'memory near limit', 'saved context'],
        onSelect: () => navigateToProfileScopedRoute({ pathname: '/memory' })
      },
      {
        id: 'operation:diagnostics:open',
        group: 'Operations',
        title: 'Open diagnostics',
        subtitle: 'Open Overview for Hermes status and doctor diagnostics',
        keywords: ['diagnostics', 'doctor', 'hermes status', 'overview diagnostics', 'health'],
        onSelect: () => navigateToProfileScopedRoute({ pathname: '/' })
      },
      ...clearFilterResults
    ];

    const sessionResults: CommandResult[] =
      sessionsQuery.data?.data.sessions.slice(0, deferredQuery ? undefined : 8).map((session) => ({
        id: `session:${session.id}`,
        group: 'Sessions',
        title: session.title,
        subtitle: [session.agentLabel, session.sessionId, session.sourceLabel].filter(Boolean).join(' · '),
        keywords: [
          session.title,
          session.displayName,
          session.agentLabel,
          session.sessionId,
          session.platform,
          session.model
        ].filter((value): value is string => value != null),
        onSelect: () => {
          onClose();
          void router.navigate({
            to: '/sessions/$agentId/$sessionId',
            params: {
              agentId: session.agentId,
              sessionId: session.sessionId
            }
          });
        }
      })) ?? [];

    const cronResults: CommandResult[] =
      cronQuery.data?.data.jobs.slice(0, deferredQuery ? undefined : 8).map((job) => ({
        id: `cron:${job.summaryId}`,
        group: 'Cron',
        title: job.name,
        subtitle: [job.agentLabel, job.scheduleDisplay, job.deliver].filter(Boolean).join(' · '),
        keywords: [job.name, job.agentLabel, job.jobId, job.scheduleDisplay, job.deliver].filter(
          (value): value is string => value != null
        ),
        onSelect: () => {
          onClose();
          void router.navigate({
            to: '/cron/$agentId/$jobId',
            params: {
              agentId: job.agentId,
              jobId: job.jobId
            }
          });
        }
      })) ?? [];

    const skillResults: CommandResult[] =
      skillsQuery.data?.data.skills.slice(0, deferredQuery ? undefined : 8).map((skill) => ({
        id: `skill:${skill.id}`,
        group: 'Skills',
        title: skill.name,
        subtitle: [skill.category, skill.description].filter(Boolean).join(' · '),
        keywords: [skill.name, skill.slug, skill.category, skill.description].filter(Boolean),
        onSelect: () => {
          onClose();
          void router.navigate({
            to: '/skills/$skillId',
            params: {
              skillId: skill.id
            }
          });
        }
      })) ?? [];

    const fileResults: CommandResult[] =
      filesQuery.data?.data.keyFiles.files.slice(0, deferredQuery ? undefined : 8).map((file) => ({
        id: `file:${file.id}`,
        group: 'Files',
        title: file.name,
        subtitle: file.relativePath,
        keywords: [file.name, file.relativePath, file.path, file.kind],
        onSelect: () => {
          onClose();
          void router.navigate({
            to: '/files',
            search: {
              ...createProfileSearch({
                scope: currentProfileScope
              }),
              file: file.id
            }
          });
        }
      })) ?? [];

    return filterCommandResults(
      [
        ...routeResults,
        ...profileResults,
        ...operationResults,
        ...sessionResults,
        ...cronResults,
        ...skillResults,
        ...fileResults
      ],
      deferredQuery
    );
  }, [
    cronQuery.data,
    deferredQuery,
    fallbackProfileScope,
    filesQuery.data,
    inventoryQuery.data,
    location.pathname,
    location.search,
    onClose,
    onFallbackProfileScopeChange,
    router,
    sessionsQuery.data,
    skillsQuery.data
  ]);

  useEffect(() => {
    if (activeIndex < results.length) {
      return;
    }

    setActiveIndex(Math.max(0, results.length - 1));
  }, [activeIndex, results.length]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    activeResultRef.current?.scrollIntoView({
      block: 'nearest'
    });
  }, [activeIndex, isOpen, results]);

  const groupedResults = useMemo(() => {
    const grouped = new Map<string, CommandResult[]>();

    for (const result of results) {
      const currentResults = grouped.get(result.group) ?? [];
      currentResults.push(result);
      grouped.set(result.group, currentResults);
    }

    return Array.from(grouped.entries());
  }, [results]);

  const isLoading =
    shouldLoad &&
    [inventoryQuery, sessionsQuery, cronQuery, skillsQuery, filesQuery].every(
      (queryState) => queryState.data == null && queryState.isPending
    );
  const hasLoadedData = [inventoryQuery, sessionsQuery, cronQuery, skillsQuery, filesQuery].some(
    (queryState) => queryState.data != null
  );

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 px-4 py-[10vh] backdrop-blur-sm"
      onClick={onClose}
    >
      <section
        role="dialog"
        aria-label="Global search"
        aria-modal="true"
        className="w-full max-w-3xl rounded-2xl border border-border bg-surface/95 shadow-2xl shadow-black/50"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-border/80 p-4">
          <div className="flex items-center gap-3 rounded-xl border border-border/80 bg-bg/40 px-3 py-3">
            <Search className="h-4 w-4 text-fg-faint" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'ArrowDown') {
                  event.preventDefault();
                  setActiveIndex((currentIndex) => Math.min(currentIndex + 1, Math.max(results.length - 1, 0)));
                }

                if (event.key === 'ArrowUp') {
                  event.preventDefault();
                  setActiveIndex((currentIndex) => Math.max(currentIndex - 1, 0));
                }

                if (event.key === 'Enter') {
                  event.preventDefault();
                  const selectedResult = results[activeIndex] ?? results[0];
                  selectedResult?.onSelect();
                }
              }}
              placeholder="Search routes, profiles, sessions, cron jobs, skills, and files"
              className="w-full bg-transparent text-sm text-fg outline-none placeholder:text-fg-muted"
            />
            <span className="rounded-md border border-border/80 bg-bg/60 px-2 py-1 font-mono text-[11px] uppercase tracking-[0.16em] text-fg-faint">
              Esc
            </span>
          </div>
        </div>

        <div className="max-h-[65vh] overflow-auto p-4">
          {isLoading ? (
            <EmptyState
              eyebrow="Loading"
              title="Preparing search"
              description="Reading route and entity data from the local API."
            />
          ) : null}

          {!isLoading && !hasLoadedData ? (
            <EmptyState
              eyebrow="Unavailable"
              title="Search data could not be loaded"
              description="The command palette opened, but no searchable route data was available."
              tone="danger"
            />
          ) : null}

          {!isLoading && hasLoadedData && results.length === 0 ? (
            <EmptyState
              eyebrow="No matches"
              title="Nothing matched this search"
              description="Try a route name, profile, session id, cron job name, skill, or file path."
            />
          ) : null}

          {!isLoading && results.length > 0 ? (
            <div className="space-y-5">
              {groupedResults.map(([group, groupResults]) => (
                <section key={group}>
                  <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.18em] text-fg-faint">{group}</p>
                  <div className="space-y-2">
                    {groupResults.map((result) => {
                      const resultIndex = results.findIndex((candidate) => candidate.id === result.id);
                      const isActive = resultIndex === activeIndex;

                      return (
                        <button
                          key={result.id}
                          type="button"
                          ref={isActive ? activeResultRef : null}
                          onMouseEnter={() => setActiveIndex(resultIndex)}
                          onClick={result.onSelect}
                          className={[
                            'flex w-full items-start justify-between gap-3 rounded-xl border px-3 py-3 text-left transition-colors',
                            isActive
                              ? 'border-accent/60 bg-accent/10'
                              : 'border-border/70 bg-bg/30 hover:border-border hover:bg-bg/50'
                          ].join(' ')}
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-fg-strong">{result.title}</p>
                            <p className="mt-1 truncate text-sm text-fg-muted">{result.subtitle}</p>
                          </div>
                          <span className="rounded-md border border-border/80 bg-bg/50 px-2 py-1 font-mono text-[11px] uppercase tracking-[0.16em] text-fg-faint">
                            {group}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border/80 px-4 py-3 text-[11px] text-fg-faint">
          <span>↑/↓ navigate · Enter open · Esc close</span>
          <span>{results.length} results</span>
        </div>
      </section>
    </div>
  );
}
