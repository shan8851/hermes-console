import type { QueryKey } from '@tanstack/react-query';
import { useMemo, useState, type ReactNode } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';

import { AppSelect } from '@/components/ui/app-select';
import { EmptyState } from '@/components/ui/empty-state';
import { RefreshButton } from '@/components/ui/refresh-button';
import {
  summarizeUsageWindow,
  type HermesUsageSummary,
  type UsageBreakdownRow,
  type UsageSessionRecord,
  type UsageWindowId,
  type UsageWindowSummary
} from '@hermes-console/runtime';

const WINDOW_DAY_COUNT: Record<UsageWindowId, number> = {
  '1d': 1,
  '7d': 7,
  '30d': 30
};

function formatInteger(value: number): string {
  return new Intl.NumberFormat().format(value);
}

function formatCompactInteger(value: number): string {
  return new Intl.NumberFormat(undefined, {
    notation: 'compact',
    maximumFractionDigits: 1
  }).format(value);
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: value >= 100 ? 0 : 2
  }).format(value);
}

function getTooltipNumber(value: number | string | ReadonlyArray<number | string> | undefined): number {
  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : 0;
  }

  if (Array.isArray(value)) {
    const [firstValue] = value;

    return getTooltipNumber(firstValue);
  }

  return 0;
}

function formatTimelineLabel(timestamp: number, windowId: UsageWindowId): string {
  const date = new Date(timestamp);

  if (windowId === '1d') {
    return date.toLocaleTimeString([], {
      hour: 'numeric'
    });
  }

  return date.toLocaleDateString([], {
    month: 'short',
    day: 'numeric'
  });
}

function getBucketStart(timestamp: number, windowId: UsageWindowId): number {
  const date = new Date(timestamp);

  if (windowId === '1d') {
    date.setMinutes(0, 0, 0);
    return date.getTime();
  }

  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function buildBucketStarts(now: Date, windowId: UsageWindowId): number[] {
  const bucketCount = windowId === '1d' ? 24 : WINDOW_DAY_COUNT[windowId];
  const bucketSizeMs = windowId === '1d' ? 60 * 60 * 1_000 : 24 * 60 * 60 * 1_000;
  const currentBucketStart = getBucketStart(now.getTime(), windowId);

  return Array.from(
    { length: bucketCount },
    (_, index) => currentBucketStart - (bucketCount - index - 1) * bucketSizeMs
  );
}

function getCurrentUsageWindow({
  now,
  records,
  usage,
  windowId
}: {
  now: Date;
  records: HermesUsageSummary['records'];
  usage: HermesUsageSummary;
  windowId: UsageWindowId;
}): UsageWindowSummary {
  if (records.length > 0) {
    return summarizeUsageWindow({
      records,
      windowId,
      now
    });
  }

  const matchingWindow = usage.windows.find((window) => window.id === windowId);

  if (matchingWindow) {
    return matchingWindow;
  }

  return summarizeUsageWindow({
    records: [],
    windowId,
    now
  });
}

function createAgentOptions(usage: HermesUsageSummary) {
  return [
    {
      value: 'all',
      label: 'All agents'
    },
    ...usage.agents.map((agent) => ({
      value: agent.id,
      label: agent.label
    }))
  ];
}

function UsageSummaryGrid({ items }: { items: Array<{ label: string; value: string; detail: string }> }) {
  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <article key={item.label} className="rounded-lg border border-border bg-surface/70 p-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-fg-faint">{item.label}</p>
          <p className="mt-3 font-(family-name:--font-bricolage) text-2xl font-semibold tracking-tight text-fg-strong">
            {item.value}
          </p>
          <p className="mt-2 text-sm leading-6 text-fg-muted">{item.detail}</p>
        </article>
      ))}
    </section>
  );
}

function BreakdownTable({
  title,
  description,
  rows
}: {
  title: string;
  description: string;
  rows: UsageBreakdownRow[];
}) {
  return (
    <section className="rounded-lg border border-border bg-surface/70 p-4">
      <div className="mb-4">
        <h3 className="font-(family-name:--font-bricolage) text-base font-semibold text-fg-strong">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-fg-muted">{description}</p>
      </div>
      {rows.length === 0 ? (
        <div className="rounded-md border border-dashed border-border/80 p-4 text-sm leading-6 text-fg-muted">
          No usage data landed in this window yet.
        </div>
      ) : (
        <div className="overflow-auto">
          <table className="min-w-full border-separate border-spacing-y-2 text-sm">
            <thead>
              <tr className="text-left text-fg-faint">
                <th className="px-3 py-1 font-mono text-[11px] uppercase tracking-[0.16em]">name</th>
                <th className="px-3 py-1 font-mono text-[11px] uppercase tracking-[0.16em]">sessions</th>
                <th className="px-3 py-1 font-mono text-[11px] uppercase tracking-[0.16em]">tokens</th>
                <th className="px-3 py-1 font-mono text-[11px] uppercase tracking-[0.16em]">cost</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.key} className="rounded-md border border-border/70 bg-bg/40 text-fg-muted">
                  <td className="rounded-l-md px-3 py-3 text-fg-strong">{row.label}</td>
                  <td className="px-3 py-3">{formatInteger(row.sessions)}</td>
                  <td className="px-3 py-3">{formatInteger(row.totalTokens)}</td>
                  <td className="rounded-r-md px-3 py-3">{formatCurrency(row.estimatedCostUsd)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function UsageChartCard({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-border bg-surface/70 p-4">
      <div className="mb-4">
        <h3 className="font-(family-name:--font-bricolage) text-base font-semibold text-fg-strong">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-fg-muted">{description}</p>
      </div>
      {children}
    </section>
  );
}

function buildTimelineData({
  now,
  records,
  windowId
}: {
  now: Date;
  records: UsageSessionRecord[];
  windowId: UsageWindowId;
}) {
  const bucketStarts = buildBucketStarts(now, windowId);
  const bucketIndex = new Map(
    bucketStarts.map((bucketStart) => [
      bucketStart,
      {
        label: formatTimelineLabel(bucketStart, windowId),
        sessions: 0,
        totalTokens: 0,
        estimatedCostUsd: 0
      }
    ])
  );
  const windowStart = bucketStarts[0] ?? getBucketStart(now.getTime(), windowId);

  records.forEach((record) => {
    const startedAt = new Date(record.startedAt).getTime();

    if (Number.isNaN(startedAt) || startedAt < windowStart) {
      return;
    }

    const bucketStart = getBucketStart(startedAt, windowId);
    const entry = bucketIndex.get(bucketStart);

    if (!entry) {
      return;
    }

    entry.sessions += 1;
    entry.totalTokens += record.totalTokens;
    entry.estimatedCostUsd += record.estimatedCostUsd ?? 0;
  });

  return bucketStarts.map((bucketStart) => {
    const entry = bucketIndex.get(bucketStart);

    return {
      label: formatTimelineLabel(bucketStart, windowId),
      sessions: entry?.sessions ?? 0,
      totalTokens: entry?.totalTokens ?? 0,
      estimatedCostUsd: Number((entry?.estimatedCostUsd ?? 0).toFixed(4))
    };
  });
}

function UsageTimelineChart({
  records,
  usageWindowTimestamp,
  windowId
}: {
  records: UsageSessionRecord[];
  usageWindowTimestamp: Date;
  windowId: UsageWindowId;
}) {
  const data = useMemo(
    () =>
      buildTimelineData({
        now: usageWindowTimestamp,
        records,
        windowId
      }),
    [records, usageWindowTimestamp, windowId]
  );

  if (data.every((point) => point.sessions === 0 && point.totalTokens === 0)) {
    return (
      <div className="rounded-md border border-dashed border-border/80 p-4 text-sm leading-6 text-fg-muted">
        No session activity landed in this window yet.
      </div>
    );
  }

  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
          <XAxis dataKey="label" stroke="rgba(180,191,210,0.8)" tickLine={false} axisLine={false} fontSize={12} />
          <YAxis
            yAxisId="tokens"
            stroke="rgba(180,191,210,0.8)"
            tickLine={false}
            axisLine={false}
            tickFormatter={formatCompactInteger}
            fontSize={12}
          />
          <YAxis
            yAxisId="sessions"
            orientation="right"
            stroke="rgba(180,191,210,0.8)"
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
            fontSize={12}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(9, 13, 20, 0.96)',
              border: '1px solid rgba(113, 127, 150, 0.35)',
              borderRadius: '12px',
              color: '#f5f7fb'
            }}
            formatter={(value, name) => {
              const numericValue = getTooltipNumber(value);

              if (name === 'sessions') {
                return [formatInteger(numericValue), 'sessions'];
              }

              if (name === 'totalTokens') {
                return [formatInteger(numericValue), 'tokens'];
              }

              return [formatCurrency(numericValue), 'cost'];
            }}
          />
          <Legend />
          <Bar
            yAxisId="sessions"
            dataKey="sessions"
            name="sessions"
            fill="rgba(124, 58, 237, 0.55)"
            radius={[6, 6, 0, 0]}
          />
          <Line
            yAxisId="tokens"
            type="monotone"
            dataKey="totalTokens"
            name="totalTokens"
            stroke="#f59e0b"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 5, fill: '#f59e0b' }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

function UsageBreakdownChart({ current }: { current: UsageWindowSummary }) {
  const data = [
    {
      name: 'tokens',
      inputTokens: current.inputTokens,
      outputTokens: current.outputTokens,
      cacheReadTokens: current.cacheReadTokens,
      cacheWriteTokens: current.cacheWriteTokens,
      reasoningTokens: current.reasoningTokens
    }
  ];

  if (
    current.inputTokens === 0 &&
    current.outputTokens === 0 &&
    current.cacheReadTokens === 0 &&
    current.cacheWriteTokens === 0 &&
    current.reasoningTokens === 0
  ) {
    return (
      <div className="rounded-md border border-dashed border-border/80 p-4 text-sm leading-6 text-fg-muted">
        No token categories were recorded in this window yet.
      </div>
    );
  }

  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.08)" horizontal={false} />
          <XAxis
            type="number"
            stroke="rgba(180,191,210,0.8)"
            tickLine={false}
            axisLine={false}
            tickFormatter={formatCompactInteger}
            fontSize={12}
          />
          <YAxis type="category" dataKey="name" hide />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(9, 13, 20, 0.96)',
              border: '1px solid rgba(113, 127, 150, 0.35)',
              borderRadius: '12px',
              color: '#f5f7fb'
            }}
            formatter={(value, name) => [formatInteger(getTooltipNumber(value)), String(name)]}
          />
          <Legend />
          <Bar dataKey="inputTokens" stackId="tokens" name="input" fill="#38bdf8" radius={[6, 0, 0, 6]} />
          <Bar dataKey="outputTokens" stackId="tokens" name="output" fill="#f59e0b" />
          <Bar dataKey="cacheReadTokens" stackId="tokens" name="cache read" fill="#10b981" />
          <Bar dataKey="cacheWriteTokens" stackId="tokens" name="cache write" fill="#14b8a6" />
          <Bar dataKey="reasoningTokens" stackId="tokens" name="reasoning" fill="#8b5cf6" radius={[0, 6, 6, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function UsageBrowser({ refreshQueryKeys, usage }: { refreshQueryKeys: QueryKey[]; usage: HermesUsageSummary }) {
  const [windowId, setWindowId] = useState<UsageWindowId>(
    usage.availableWindows[1] ?? usage.availableWindows[0] ?? '7d'
  );
  const [agentId, setAgentId] = useState('all');
  const usageWindowTimestamp = useMemo(() => new Date(usage.loadedAt), [usage.loadedAt]);
  const filteredRecords = useMemo(
    () => (agentId === 'all' ? usage.records : usage.records.filter((record) => record.agentId === agentId)),
    [agentId, usage.records]
  );
  const current = useMemo(
    () =>
      getCurrentUsageWindow({
        now: usageWindowTimestamp,
        records: filteredRecords,
        usage,
        windowId
      }),
    [filteredRecords, usage, usageWindowTimestamp, windowId]
  );
  const hasActiveFilters = agentId !== 'all';
  const selectedAgentLabel = usage.agents.find((agent) => agent.id === agentId)?.label ?? agentId;
  const representedAgentCount =
    filteredRecords.length > 0 ? new Set(filteredRecords.map((record) => record.agentId)).size : current.byAgent.length;
  const summaryItems = [
    {
      label: 'total tokens',
      value: formatInteger(current.totalTokens),
      detail:
        agentId === 'all'
          ? `${formatInteger(current.sessionCount)} sessions in the selected window.`
          : `${formatInteger(current.sessionCount)} sessions for ${selectedAgentLabel} in this window.`
    },
    {
      label: 'estimated cost',
      value: formatCurrency(current.estimatedCostUsd),
      detail: 'Estimated cost. Subscription models may show $0.'
    },
    {
      label: 'top model',
      value: current.topModel?.label ?? '—',
      detail: current.topModel
        ? `${formatInteger(current.topModel.totalTokens)} tokens`
        : 'No model usage recorded in this window.'
    },
    {
      label: 'agents represented',
      value: formatInteger(representedAgentCount),
      detail: agentId === 'all' ? 'Agents with usage in the current view.' : 'A filtered view is focused on one agent.'
    }
  ];
  const tokenBreakdown = [
    { label: 'input', value: formatInteger(current.inputTokens) },
    { label: 'output', value: formatInteger(current.outputTokens) },
    { label: 'cache read', value: formatInteger(current.cacheReadTokens) },
    { label: 'cache write', value: formatInteger(current.cacheWriteTokens) },
    { label: 'reasoning', value: formatInteger(current.reasoningTokens) }
  ];

  return (
    <div className="space-y-8">
      <section>
        <div className="flex flex-wrap items-center gap-3">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-accent">Usage</p>
          <RefreshButton loadedAt={usage.loadedAt} queryKeys={refreshQueryKeys} />
        </div>
        <h2 className="mt-3 font-(family-name:--font-bricolage) text-xl font-semibold tracking-tight text-fg-strong sm:text-2xl">
          Token usage and estimated cost
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-fg-muted">
          Usage read from Hermes session storage and grouped into 1 day, 7 day, and 30 day views.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap gap-2">
            {usage.availableWindows.map((id) => {
              const active = id === current.id;

              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setWindowId(id)}
                  className={[
                    'rounded-xl border px-3 py-2 text-sm transition-colors',
                    active
                      ? 'border-accent/50 bg-accent/10 text-accent'
                      : 'border-border/70 bg-bg/35 text-fg-muted hover:text-fg'
                  ].join(' ')}
                >
                  {id}
                </button>
              );
            })}
          </div>
          <AppSelect
            value={agentId}
            onChange={setAgentId}
            options={createAgentOptions(usage)}
            ariaLabel="Filter usage by agent"
            className="min-w-46 flex-[0_1_12rem]"
          />
          {hasActiveFilters ? (
            <button
              type="button"
              onClick={() => setAgentId('all')}
              className="rounded-xl border border-border/70 bg-bg/35 px-3 py-2.5 text-sm text-fg-muted transition-colors hover:border-accent/35 hover:text-fg"
            >
              Clear filters
            </button>
          ) : null}
        </div>
      </section>

      <UsageSummaryGrid items={summaryItems} />

      {current.sessionCount === 0 ? (
        <EmptyState
          eyebrow="No usage"
          title="No usage landed in this window"
          description={
            hasActiveFilters
              ? `There were no usage records for ${selectedAgentLabel} in the selected time window.`
              : 'There were no usage records in the selected time window.'
          }
          action={
            hasActiveFilters ? (
              <button
                type="button"
                onClick={() => setAgentId('all')}
                className="rounded-md border border-border/80 bg-bg/40 px-3 py-1.5 text-xs text-fg-muted transition-colors hover:border-accent/40 hover:text-fg"
              >
                Reset filters
              </button>
            ) : null
          }
        />
      ) : (
        <>
          <div className="grid gap-6 xl:grid-cols-2">
            <UsageChartCard
              title="Usage timeline"
              description="Sessions and token volume over the selected time window."
            >
              <UsageTimelineChart
                records={filteredRecords}
                usageWindowTimestamp={usageWindowTimestamp}
                windowId={current.id}
              />
            </UsageChartCard>
            <UsageChartCard
              title="Token mix"
              description="How the current window splits across input, output, cache, and reasoning tokens."
            >
              <UsageBreakdownChart current={current} />
            </UsageChartCard>
          </div>

          <section className="rounded-lg border border-border bg-surface/70 p-4">
            <div className="mb-4">
              <h3 className="font-(family-name:--font-bricolage) text-base font-semibold text-fg-strong">
                Token breakdown
              </h3>
              <p className="mt-2 text-sm leading-6 text-fg-muted">
                Input, output, cache, and reasoning totals for the selected window.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              {tokenBreakdown.map((item) => (
                <article key={item.label} className="rounded-md border border-border/70 bg-bg/40 p-4">
                  <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-fg-faint">{item.label}</p>
                  <p className="mt-2 font-(family-name:--font-bricolage) text-2xl font-semibold tracking-tight text-fg-strong">
                    {item.value}
                  </p>
                </article>
              ))}
            </div>
          </section>

          <div className="grid gap-6 xl:grid-cols-2">
            <BreakdownTable
              title="By model"
              description="Which models are driving token usage in the selected window."
              rows={current.byModel}
            />
            <BreakdownTable
              title="By agent"
              description="How usage is split across the default agent and any profile agents."
              rows={current.byAgent}
            />
          </div>
        </>
      )}
    </div>
  );
}
