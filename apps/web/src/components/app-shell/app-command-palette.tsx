import { useQuery } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { Search } from 'lucide-react';
import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';

import {
  filterCommandResults,
  isEditableTarget,
  type CommandResult
} from '@/components/app-shell/app-command-palette-utils';
import { EmptyState } from '@/components/ui/empty-state';
import { useWindowKeydown } from '@/hooks/useWindowKeydown';
import {
  cronQueryOptions,
  filesQueryOptions,
  inventoryQueryOptions,
  sessionsQueryOptions,
  skillsQueryOptions
} from '@/lib/api';
import { appRoutes } from '@/lib/navigation';

export function AppCommandPalette({
  isOpen,
  onClose,
  onOpen
}: {
  isOpen: boolean;
  onClose: () => void;
  onOpen: () => void;
}) {
  const router = useRouter();
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
    const routeResults: CommandResult[] = appRoutes.map((route) => ({
      id: `route:${route.href}`,
      group: 'Routes',
      title: route.label,
      subtitle: route.description,
      keywords: [route.href, route.label, route.description],
      onSelect: () => {
        onClose();
        void router.navigate({
          to: route.href
        });
      }
    }));

    const agentResults: CommandResult[] =
      inventoryQuery.data?.data.agents.map((agent) => ({
        id: `agent:${agent.id}`,
        group: 'Agents',
        title: agent.label,
        subtitle: agent.rootPath,
        keywords: [agent.id, agent.label, agent.rootPath, agent.source],
        onSelect: () => {
          onClose();
          void router.navigate({
            to: '/sessions',
            search: {
              agent: agent.id
            }
          });
        }
      })) ?? [];

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
            to: '/sessions',
            search: {
              agent: session.agentId,
              q: session.sessionId
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
              file: file.id
            }
          });
        }
      })) ?? [];

    return filterCommandResults(
      [...routeResults, ...agentResults, ...sessionResults, ...cronResults, ...skillResults, ...fileResults],
      deferredQuery
    );
  }, [
    cronQuery.data,
    deferredQuery,
    filesQuery.data,
    inventoryQuery.data,
    onClose,
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
              placeholder="Search routes, agents, sessions, cron jobs, skills, and files"
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
              description="Try a route name, agent, session id, cron job name, skill, or file path."
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
