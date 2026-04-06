import type { HermesSessionSummary } from "@hermes-console/runtime";

function formatTimestamp(value: string) {
  return new Date(value).toLocaleString();
}

function formatCount(value: number) {
  return new Intl.NumberFormat().format(value);
}

function formatCost(value: number | null) {
  if (value == null) {
    return null;
  }

  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 4,
  }).format(value);
}

export function SessionsIndex({ sessions }: { sessions: HermesSessionSummary[] }) {
  if (sessions.length === 0) {
    return (
      <section className="rounded-lg border border-border bg-surface/70 p-4">
        <div className="rounded-md border border-dashed border-border/80 p-4 text-sm leading-6 text-fg-muted">
          No sessions matched the current filters.
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-border bg-surface/70 p-4 xl:max-h-[58rem] xl:overflow-auto">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="font-[family-name:var(--font-bricolage)] text-base font-semibold text-fg-strong">
            Recent sessions
          </h3>
          <p className="mt-2 text-sm leading-6 text-fg-muted">
            Sessions across all detected agents.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {sessions.map((session) => {
          const formattedCost = formatCost(session.estimatedCostUsd);

          return (
            <article
              key={session.id}
              className="rounded-md border border-border/70 bg-bg/40 p-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-fg-strong">{session.title}</p>
                    <span className="rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 font-mono text-[11px] uppercase tracking-[0.16em] text-accent">
                      {session.agentLabel}
                    </span>
                    <span className="rounded-full border border-border/80 bg-bg/40 px-2 py-0.5 font-mono text-[11px] uppercase tracking-[0.16em] text-fg-muted">
                      {session.sourceLabel}
                    </span>
                    {!session.hasMessagingMetadata ? (
                      <span className="rounded-full border border-border/80 bg-bg/40 px-2 py-0.5 font-mono text-[11px] uppercase tracking-[0.16em] text-fg-muted">
                        transcript only
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 truncate text-sm leading-6 text-fg-muted">
                    {session.displayName ?? session.cronJobName ?? "—"}
                  </p>
                  <p className="mt-1 font-mono text-[11px] text-fg-faint">{session.sessionId}</p>
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-fg-muted">
                    <span>{formatCount(session.messageCount)} messages</span>
                    <span>{formatCount(session.toolCallCount)} tools</span>
                    <span>{formatCount(session.totalTokens)} tokens</span>
                    {session.model ? <span>{session.model}</span> : null}
                    {formattedCost ? <span>{formattedCost}</span> : null}
                    {session.memoryFlushed != null ? <span>{session.memoryFlushed ? "memory flushed" : "memory live"}</span> : null}
                    {session.endedAt ? <span>ended: {session.endedAt ? new Date(session.endedAt).toLocaleString() : "—"}</span> : null}
                  </div>
                </div>

                <div className="text-right text-xs text-fg-muted">
                  <p className="font-medium text-fg">{formatTimestamp(session.lastActivityAt)}</p>
                  <p className="mt-1">started {formatTimestamp(session.startedAt)}</p>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
