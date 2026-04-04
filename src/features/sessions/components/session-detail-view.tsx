import Link from "next/link";

import type { HermesSessionDetail } from "@/features/sessions/types";

function formatTimestamp(value: string | null) {
  if (!value) {
    return "—";
  }

  return new Date(value).toLocaleString();
}

function formatCount(value: number) {
  return new Intl.NumberFormat().format(value);
}

function formatCost(value: number | null) {
  if (value == null) {
    return "—";
  }

  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 4,
  }).format(value);
}

export function SessionDetailView({ detail }: { detail: HermesSessionDetail }) {
  const { summary } = detail;

  return (
    <div className="space-y-8">
      <section className="max-w-4xl">
        <div className="mb-4">
          <Link
            href="/sessions"
            className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-bg/40 px-3 py-1.5 font-mono text-xs text-fg-muted transition-colors hover:border-accent/60 hover:text-fg"
          >
            <span aria-hidden="true">←</span>
            <span>Back to sessions</span>
          </Link>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-accent">Sessions</p>
          <span className="rounded-full border border-border/80 bg-bg/40 px-2 py-0.5 font-mono text-[11px] uppercase tracking-[0.16em] text-fg-muted">
            {summary.agentLabel}
          </span>
          <span className="rounded-full border border-border/80 bg-bg/40 px-2 py-0.5 font-mono text-[11px] uppercase tracking-[0.16em] text-fg-muted">
            {summary.source ?? "unknown source"}
          </span>
          {summary.platform ? (
            <span className="rounded-full border border-border/80 bg-bg/40 px-2 py-0.5 font-mono text-[11px] uppercase tracking-[0.16em] text-fg-muted">
              {summary.platform}
            </span>
          ) : null}
          <span className="rounded-full border border-border/80 bg-bg/40 px-2 py-0.5 font-mono text-[11px] uppercase tracking-[0.16em] text-fg-muted">
            {summary.hasMessagingMetadata ? "joined metadata" : "state only"}
          </span>
        </div>
        <h2 className="mt-3 font-[family-name:var(--font-bricolage)] text-xl font-semibold tracking-tight text-fg-strong sm:text-2xl">
          {summary.title}
        </h2>
        <p className="mt-3 text-sm leading-7 text-fg-muted">
          {summary.displayName ?? "This session has transcript/state data, but no messaging display metadata to decorate it with."}
        </p>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "last activity",
            value: formatTimestamp(summary.lastActivityAt),
            detail: `started ${formatTimestamp(summary.startedAt)}`,
          },
          {
            label: "messages",
            value: formatCount(summary.messageCount),
            detail: `${formatCount(summary.toolCallCount)} tool calls recorded in state.db`,
          },
          {
            label: "tokens",
            value: formatCount(summary.totalTokens),
            detail: summary.model ?? "No model metadata stored",
          },
          {
            label: "cost",
            value: formatCost(summary.estimatedCostUsd),
            detail: summary.costStatus ?? "unknown",
          },
        ].map((item) => (
          <article key={item.label} className="rounded-lg border border-border bg-surface/70 p-4">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-fg-faint">{item.label}</p>
            <p className="mt-3 font-[family-name:var(--font-bricolage)] text-xl font-semibold tracking-tight text-fg-strong">
              {item.value}
            </p>
            <p className="mt-2 text-sm leading-6 text-fg-muted">{item.detail}</p>
          </article>
        ))}
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.72fr)_minmax(0,1.28fr)]">
        <section className="rounded-lg border border-border bg-surface/70 p-4">
          <h3 className="font-[family-name:var(--font-bricolage)] text-base font-semibold text-fg-strong">
            Session metadata
          </h3>
          <div className="mt-4 space-y-3 text-sm text-fg-muted">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-fg-faint">session id</p>
              <p className="mt-1 break-all font-mono text-xs text-fg">{summary.sessionId}</p>
            </div>
            {summary.sessionKey ? (
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-fg-faint">session key</p>
                <p className="mt-1 break-all font-mono text-xs text-fg">{summary.sessionKey}</p>
              </div>
            ) : null}
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-fg-faint">agent root</p>
              <p className="mt-1 break-all font-mono text-xs text-fg">{summary.agentRootPath}</p>
            </div>
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-fg-faint">ended</p>
              <p className="mt-1 text-fg">{formatTimestamp(summary.endedAt)}</p>
            </div>
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-fg-faint">memory flush</p>
              <p className="mt-1 text-fg">{summary.memoryFlushed == null ? "unknown" : summary.memoryFlushed ? "yes" : "no"}</p>
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-border bg-surface/70 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-[family-name:var(--font-bricolage)] text-base font-semibold text-fg-strong">
                Message preview
              </h3>
              <p className="mt-2 text-sm leading-6 text-fg-muted">
                First pass is read-only and grounded in the stored transcript rows from <span className="font-mono text-xs text-fg">state.db</span>.
              </p>
            </div>
            <p className="text-xs text-fg-muted">{formatCount(detail.messageCount)} rows</p>
          </div>

          {detail.hasMessagePreview ? (
            <div className="mt-4 space-y-3 xl:max-h-[52rem] xl:overflow-auto xl:pr-1">
              {detail.preview.map((message) => (
                <article key={message.id} className="rounded-md border border-border/70 bg-bg/40 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-border/80 bg-bg/40 px-2 py-0.5 font-mono text-[11px] uppercase tracking-[0.16em] text-fg-muted">
                        {message.role}
                      </span>
                      {message.toolName ? (
                        <span className="rounded-full border border-border/80 bg-bg/40 px-2 py-0.5 font-mono text-[11px] uppercase tracking-[0.16em] text-fg-muted">
                          {message.toolName}
                        </span>
                      ) : null}
                    </div>
                    <p className="text-xs text-fg-muted">{formatTimestamp(message.timestamp)}</p>
                  </div>
                  <pre className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-fg">{message.content}</pre>
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-md border border-dashed border-border/80 p-4 text-sm leading-6 text-fg-muted">
              No message rows were available for this session preview.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
