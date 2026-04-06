import type { QueryKey } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { RefreshButton } from "@/components/ui/refresh-button";
import type { HermesUsageSummary, UsageBreakdownRow, UsageWindowId } from "@hermes-console/runtime";

function formatInteger(value: number) {
  return new Intl.NumberFormat().format(value);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value >= 100 ? 0 : 2,
  }).format(value);
}

function UsageSummaryGrid({
  items,
}: {
  items: Array<{ label: string; value: string; detail: string }>;
}) {
  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <article key={item.label} className="rounded-lg border border-border bg-surface/70 p-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-fg-faint">{item.label}</p>
          <p className="mt-3 font-[family-name:var(--font-bricolage)] text-2xl font-semibold tracking-tight text-fg-strong">{item.value}</p>
          <p className="mt-2 text-sm leading-6 text-fg-muted">{item.detail}</p>
        </article>
      ))}
    </section>
  );
}

function BreakdownTable({ title, description, rows }: { title: string; description: string; rows: UsageBreakdownRow[] }) {
  return (
    <section className="rounded-lg border border-border bg-surface/70 p-4">
      <div className="mb-4">
        <h3 className="font-[family-name:var(--font-bricolage)] text-base font-semibold text-fg-strong">{title}</h3>
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

export function UsageBrowser({
  refreshQueryKeys,
  usage,
}: {
  refreshQueryKeys: QueryKey[];
  usage: HermesUsageSummary;
}) {
  const [windowId, setWindowId] = useState<UsageWindowId>("7d");

  const current = useMemo(
    () => usage.windows.find((window) => window.id === windowId) ?? usage.windows[0],
    [usage.windows, windowId],
  );

  if (!current) {
    return (
      <section className="rounded-lg border border-border bg-surface/70 p-4">
        <div className="rounded-md border border-dashed border-border/80 p-4 text-sm leading-6 text-fg-muted">
          No usage windows were available in the current response.
        </div>
      </section>
    );
  }

  const summaryItems = [
    {
      label: "total tokens",
      value: formatInteger(current.totalTokens),
      detail: `${formatInteger(current.sessionCount)} sessions in the selected window.`,
    },
    {
      label: "estimated cost",
      value: formatCurrency(current.estimatedCostUsd),
      detail: "Estimated cost. Subscription models may show $0.",
    },
    {
      label: "top model",
      value: current.topModel?.label ?? "—",
      detail: current.topModel ? `${formatInteger(current.topModel.totalTokens)} tokens` : "No model usage recorded in this window.",
    },
    {
      label: "top agent",
      value: current.topAgent?.label ?? "—",
      detail: current.topAgent ? `${formatInteger(current.topAgent.totalTokens)} tokens` : "No agent usage recorded in this window.",
    },
  ];

  const tokenBreakdown = [
    { label: "input", value: formatInteger(current.inputTokens) },
    { label: "output", value: formatInteger(current.outputTokens) },
    { label: "cache read", value: formatInteger(current.cacheReadTokens) },
    { label: "cache write", value: formatInteger(current.cacheWriteTokens) },
    { label: "reasoning", value: formatInteger(current.reasoningTokens) },
  ];

  return (
    <div className="space-y-8">
      <section className="max-w-4xl">
        <div className="flex flex-wrap items-center gap-3">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-accent">Usage</p>
          <RefreshButton loadedAt={usage.loadedAt} queryKeys={refreshQueryKeys} />
        </div>
        <h2 className="mt-3 font-[family-name:var(--font-bricolage)] text-xl font-semibold tracking-tight text-fg-strong sm:text-2xl">
          Token usage and estimated cost
        </h2>
        <p className="mt-3 text-sm leading-7 text-fg-muted">
          Usage read from Hermes session storage and grouped into 1 day, 7 day, and 30 day views.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {usage.availableWindows.map((id) => {
            const active = id === current.id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setWindowId(id)}
                className={[
                  "rounded-md border px-3 py-1.5 text-sm transition-colors",
                  active ? "border-accent/50 bg-accent/10 text-accent" : "border-border/80 bg-bg/40 text-fg-muted hover:text-fg",
                ].join(" ")}
              >
                {id}
              </button>
            );
          })}
        </div>
      </section>

      <UsageSummaryGrid items={summaryItems} />

      <section className="rounded-lg border border-border bg-surface/70 p-4">
        <div className="mb-4">
          <h3 className="font-[family-name:var(--font-bricolage)] text-base font-semibold text-fg-strong">Token breakdown</h3>
          <p className="mt-2 text-sm leading-6 text-fg-muted">Input, output, cache, and reasoning tokens for the selected window.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {tokenBreakdown.map((item) => (
            <article key={item.label} className="rounded-md border border-border/70 bg-bg/40 p-4">
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-fg-faint">{item.label}</p>
              <p className="mt-2 font-[family-name:var(--font-bricolage)] text-2xl font-semibold tracking-tight text-fg-strong">{item.value}</p>
            </article>
          ))}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <BreakdownTable title="By model" description="Which models are driving token usage in the selected window." rows={current.byModel} />
        <BreakdownTable title="By agent" description="How usage is split across the default agent and any profile agents." rows={current.byAgent} />
      </div>
    </div>
  );
}
