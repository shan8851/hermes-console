import { useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';

import { AppSelect } from '@/components/ui/app-select';
import { EmptyState } from '@/components/ui/empty-state';
import { RefreshButton } from '@/components/ui/refresh-button';
import { SearchInput } from '@/components/ui/search-input';
import { apiQueryKeys, logDetailQueryOptions } from '@/lib/api';
import type { HermesLogDetail, HermesLogFileSummary } from '@hermes-console/runtime';

const levelOptions = [
  { value: 'all', label: 'All levels' },
  { value: 'error', label: 'Error' },
  { value: 'warning', label: 'Warning' },
  { value: 'info', label: 'Info' },
  { value: 'debug', label: 'Debug' },
  { value: 'other', label: 'Other' }
];

const lineOptions = [
  { value: '50', label: '50 lines' },
  { value: '100', label: '100 lines' },
  { value: '200', label: '200 lines' },
  { value: '500', label: '500 lines' }
];

function formatNumber(value: number) {
  return new Intl.NumberFormat().format(value);
}

function formatBytes(value: number) {
  if (value < 1024) {
    return `${value} B`;
  }

  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }

  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function lineTone(level: string) {
  if (level === 'error') {
    return 'text-rose-200';
  }

  if (level === 'warning') {
    return 'text-amber-200';
  }

  if (level === 'info') {
    return 'text-sky-200';
  }

  if (level === 'debug') {
    return 'text-fg-muted';
  }

  return 'text-fg';
}

function createSummaryItems(logs: HermesLogFileSummary[], selectedDetail: HermesLogDetail | null) {
  return [
    {
      label: 'log files',
      value: formatNumber(logs.length),
      detail: 'Detected Hermes runtime logs.'
    },
    {
      label: 'tail errors',
      value: formatNumber(logs.reduce((sum, log) => sum + log.errorLineCount, 0)),
      detail: 'Errors counted from the analyzed tail window.'
    },
    {
      label: 'tail warnings',
      value: formatNumber(logs.reduce((sum, log) => sum + log.warningLineCount, 0)),
      detail: 'Warnings counted from the analyzed tail window.'
    },
    {
      label: 'selected lines',
      value: formatNumber(selectedDetail?.returnedLines ?? 0),
      detail: 'Lines loaded for the current log view.'
    }
  ];
}

function LogSummaryCard({ item }: { item: { label: string; value: string; detail: string } }) {
  return (
    <article className="rounded-lg border border-border bg-surface/70 p-4">
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-fg-faint">{item.label}</p>
      <p className="mt-3 font-[family-name:var(--font-bricolage)] text-2xl font-semibold tracking-tight text-fg-strong">
        {item.value}
      </p>
      <p className="mt-2 text-sm leading-6 text-fg-muted">{item.detail}</p>
    </article>
  );
}

function LogList({
  logs,
  selectedLogId,
  onSelect
}: {
  logs: HermesLogFileSummary[];
  selectedLogId: string | null;
  onSelect: (value: string) => void;
}) {
  return (
    <section className="rounded-lg border border-border bg-surface/70 p-4">
      <div className="mb-4">
        <h3 className="font-[family-name:var(--font-bricolage)] text-base font-semibold text-fg-strong">
          Detected logs
        </h3>
        <p className="mt-2 text-sm leading-6 text-fg-muted">Pick a runtime log to inspect its latest lines.</p>
      </div>

      <div className="space-y-3">
        {logs.map((log) => {
          const selected = log.id === selectedLogId;

          return (
            <button
              key={log.id}
              type="button"
              onClick={() => onSelect(log.id)}
              className={[
                'w-full rounded-md border p-3 text-left transition-colors',
                selected
                  ? 'border-accent/40 bg-accent/8'
                  : 'border-border/70 bg-bg/40 hover:border-accent/30 hover:bg-white/3'
              ].join(' ')}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-fg-strong">{log.name}</p>
                  <p className="mt-1 break-all font-mono text-[11px] text-fg-faint">{log.path}</p>
                  <div className="mt-3 flex flex-wrap gap-3 text-xs text-fg-muted">
                    <span>{formatBytes(log.fileSize)}</span>
                    <span>{log.errorLineCount} error</span>
                    <span>{log.warningLineCount} warn</span>
                    <span>{log.infoLineCount} info</span>
                  </div>
                </div>
                <p className="text-right text-xs text-fg-muted">{new Date(log.lastModifiedMs).toLocaleString()}</p>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function LogLines({ detail, level, query }: { detail: HermesLogDetail; level: string; query: string }) {
  const filteredLines = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return detail.lines.filter((line) => {
      if (level !== 'all' && line.level !== level) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      return line.text.toLowerCase().includes(normalizedQuery);
    });
  }, [detail.lines, level, query]);

  if (filteredLines.length === 0) {
    return (
      <EmptyState
        eyebrow="No matches"
        title="No log lines matched these filters"
        description="Try a different level filter or search term."
      />
    );
  }

  return (
    <div className="rounded-md border border-border/70 bg-bg/40">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 px-3 py-2 text-xs text-fg-muted">
        <span>
          {filteredLines.length} visible line{filteredLines.length === 1 ? '' : 's'}
        </span>
        <span>
          loaded tail: {detail.returnedLines} / requested {detail.requestedLines}
        </span>
      </div>
      <div className="max-h-[42rem] overflow-auto px-3 py-3">
        <div className="space-y-1">
          {filteredLines.map((line) => (
            <div key={line.id} className="grid grid-cols-[4rem_1fr] gap-3 font-mono text-[12px] leading-6">
              <span className="text-fg-faint">{line.lineNumber}</span>
              <span className={lineTone(line.level)}>{line.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function LogsBrowser({
  loadedAt,
  logs,
  refreshQueryKeys
}: {
  loadedAt: string;
  logs: HermesLogFileSummary[];
  refreshQueryKeys: QueryKey[];
}) {
  const queryClient = useQueryClient();
  const [selectedLogId, setSelectedLogId] = useState<string | null>(logs[0]?.id ?? null);
  const [lineCount, setLineCount] = useState('50');
  const [level, setLevel] = useState('all');
  const [query, setQuery] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(false);

  useEffect(() => {
    if (selectedLogId && logs.some((log) => log.id === selectedLogId)) {
      return;
    }

    setSelectedLogId(logs[0]?.id ?? null);
  }, [logs, selectedLogId]);

  const selectedLogQuery = useQuery({
    ...logDetailQueryOptions({
      logId: selectedLogId ?? '',
      lines: Number(lineCount)
    }),
    enabled: selectedLogId != null,
    refetchOnMount: false,
    retry: false
  });

  useEffect(() => {
    if (!autoRefresh || selectedLogId == null) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void queryClient.refetchQueries({
        exact: true,
        queryKey: apiQueryKeys.logs,
        type: 'active'
      });

      void queryClient.refetchQueries({
        exact: true,
        queryKey: apiQueryKeys.logDetail(selectedLogId, Number(lineCount)),
        type: 'active'
      });
    }, 15_000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [autoRefresh, lineCount, queryClient, selectedLogId]);

  const selectedDetail = selectedLogQuery.data?.data ?? null;
  const summaryItems = createSummaryItems(logs, selectedDetail);
  const effectiveRefreshKeys =
    selectedLogId == null
      ? refreshQueryKeys
      : [...refreshQueryKeys, apiQueryKeys.logDetail(selectedLogId, Number(lineCount))];

  if (logs.length === 0) {
    return (
      <EmptyState
        eyebrow="No logs"
        title="No Hermes log files were found"
        description="Hermes Console could not find any `.log` files under the configured Hermes runtime."
      />
    );
  }

  return (
    <div className="space-y-8">
      <section className="max-w-3xl">
        <div className="flex flex-wrap items-center gap-3">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-accent">Logs</p>
          <RefreshButton
            loadedAt={selectedLogQuery.data?.meta.capturedAt ?? loadedAt}
            queryKeys={effectiveRefreshKeys}
          />
          <button
            type="button"
            onClick={() => setAutoRefresh((previous) => !previous)}
            className={[
              'rounded-md border px-2.5 py-1 text-xs transition-colors',
              autoRefresh
                ? 'border-accent/40 bg-accent/10 text-accent'
                : 'border-border/80 bg-bg/40 text-fg-muted hover:border-accent/35 hover:text-fg'
            ].join(' ')}
          >
            auto-refresh 15s {autoRefresh ? 'on' : 'off'}
          </button>
        </div>
        <h2 className="mt-3 font-[family-name:var(--font-bricolage)] text-xl font-semibold tracking-tight text-fg-strong sm:text-2xl">
          Runtime Logs
        </h2>
        <p className="mt-3 text-sm leading-7 text-fg-muted">
          Inspect the latest Hermes runtime logs without tailing files manually. The default view loads the last 50
          lines of the selected log.
        </p>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {summaryItems.map((item) => (
          <LogSummaryCard key={item.label} item={item} />
        ))}
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(18rem,0.58fr)_minmax(0,1.42fr)]">
        <LogList logs={logs} selectedLogId={selectedLogId} onSelect={setSelectedLogId} />

        <section className="rounded-lg border border-border bg-surface/70 p-4">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-[family-name:var(--font-bricolage)] text-base font-semibold text-fg-strong">
                {selectedDetail?.file.name ?? selectedLogId ?? 'Log detail'}
              </h3>
              <p className="mt-2 text-sm leading-6 text-fg-muted">
                Filter the currently loaded tail window by level or text.
              </p>
            </div>
            {selectedDetail ? (
              <div className="text-xs text-fg-muted">
                {new Date(selectedDetail.file.lastModifiedMs).toLocaleString()}
              </div>
            ) : null}
          </div>

          <div className="mb-4 flex flex-wrap items-stretch gap-3">
            <SearchInput
              value={query}
              onChange={setQuery}
              placeholder="Search the loaded log tail"
              className="min-w-[18rem] flex-[1.8_1_24rem]"
            />
            <AppSelect
              value={level}
              onChange={setLevel}
              options={levelOptions}
              ariaLabel="Filter log lines by level"
              className="min-w-[11rem] flex-[0_1_12rem]"
            />
            <AppSelect
              value={lineCount}
              onChange={setLineCount}
              options={lineOptions}
              ariaLabel="Select log line count"
              className="min-w-[11rem] flex-[0_1_12rem]"
            />
          </div>

          {selectedLogQuery.isPending ? (
            <EmptyState eyebrow="Loading" title="Loading log detail" description="Reading the selected log tail." />
          ) : selectedLogQuery.isError ? (
            <EmptyState
              eyebrow="Unreadable"
              title="This log could not be loaded"
              description={selectedLogQuery.error.message}
              tone="danger"
            />
          ) : selectedDetail ? (
            <LogLines detail={selectedDetail} level={level} query={query} />
          ) : (
            <EmptyState
              eyebrow="Select a log"
              title="Pick a log to inspect"
              description="Choose a log file from the left to inspect its latest lines."
            />
          )}
        </section>
      </div>
    </div>
  );
}
