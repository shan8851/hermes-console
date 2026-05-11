import { Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';

import { AppBreadcrumbs } from '@/components/ui/app-breadcrumbs';
import { CopyButton } from '@/components/ui/copy-button';
import { EmptyState } from '@/components/ui/empty-state';
import type { SessionDetail, SessionMessage, SessionToolCallSummary } from '@hermes-console/runtime';

type TimelineEntry =
  | {
      kind: 'message';
      message: SessionMessage;
    }
  | {
      kind: 'omitted';
      count: number;
    };

const formatTimestamp = (value: string | null): string => {
  if (!value) {
    return '-';
  }

  return new Date(value).toLocaleString();
};

const formatDuration = (value: number | null): string => {
  if (value == null) {
    return '-';
  }

  if (value < 1_000) {
    return `${value} ms`;
  }

  const totalSeconds = Math.round(value / 1_000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes === 0) {
    return `${seconds}s`;
  }

  return `${minutes}m ${seconds}s`;
};

const formatCount = (value: number): string => new Intl.NumberFormat().format(value);

const formatCost = (value: number | null): string => {
  if (value == null) {
    return '-';
  }

  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 4
  }).format(value);
};

const buildTimelineEntries = (detail: SessionDetail): TimelineEntry[] => {
  const { messages, transcript } = detail;

  if (transcript.omittedMessageCount === 0) {
    return messages.map((message) => ({
      kind: 'message',
      message
    }));
  }

  const head = messages.slice(0, transcript.messageHeadCount).map((message) => ({
    kind: 'message' as const,
    message
  }));
  const tail = messages.slice(transcript.messageHeadCount).map((message) => ({
    kind: 'message' as const,
    message
  }));

  return [
    ...head,
    {
      kind: 'omitted',
      count: transcript.omittedMessageCount
    },
    ...tail
  ];
};

const roleClass = (role: string): string => {
  if (role === 'user') {
    return 'border-accent/30 bg-accent/10 text-accent';
  }

  if (role === 'assistant') {
    return 'border-sky-500/30 bg-sky-500/10 text-sky-200';
  }

  if (role === 'tool') {
    return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200';
  }

  return 'border-border/80 bg-bg/40 text-fg-muted';
};

const buildMessageCopy = (message: SessionMessage): string => {
  const toolNames = message.toolCalls.map((toolCall) => toolCall.name ?? toolCall.id ?? 'tool').join(', ');
  const toolLine = toolNames ? `\n[tool calls: ${toolNames}]` : '';
  const toolResultLine = message.toolName ? `\n[tool result: ${message.toolName}]` : '';
  const truncatedLine =
    message.contentOmittedCharCount > 0
      ? `\n[content truncated: ${formatCount(message.contentOmittedCharCount)} chars omitted]`
      : '';

  return `[${message.timestamp}] ${message.role}\n${message.content ?? ''}${truncatedLine}${toolLine}${toolResultLine}`;
};

const buildTranscriptCopy = (entries: TimelineEntry[]): string =>
  entries
    .map((entry) =>
      entry.kind === 'message' ? buildMessageCopy(entry.message) : `[${formatCount(entry.count)} messages omitted]`
    )
    .join('\n\n');

function DetailChip({ className, label }: { className: string; label: string }) {
  return (
    <span
      className={['rounded-full border px-2 py-0.5 font-mono text-[11px] uppercase tracking-[0.16em]', className].join(
        ' '
      )}
    >
      {label}
    </span>
  );
}

function MetadataBlock({ action, label, value }: { action?: ReactNode; label: string; value: string }) {
  return (
    <div>
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-fg-faint">{label}</p>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        <p className="break-all text-sm leading-6 text-fg">{value}</p>
        {action}
      </div>
    </div>
  );
}

function StatCard({ detail, label, value }: { detail: string; label: string; value: string }) {
  return (
    <article className="rounded-lg border border-border bg-surface/70 p-4">
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-fg-faint">{label}</p>
      <p className="mt-3 font-[family-name:var(--font-bricolage)] text-xl font-semibold tracking-tight text-fg-strong">
        {value}
      </p>
      <p className="mt-2 text-sm leading-6 text-fg-muted">{detail}</p>
    </article>
  );
}

function ToolCallDetails({ toolCalls }: { toolCalls: SessionToolCallSummary[] }) {
  if (toolCalls.length === 0) {
    return null;
  }

  return (
    <details className="mt-3 rounded-md border border-border/70 bg-bg/35 p-3">
      <summary className="cursor-pointer font-mono text-[11px] uppercase tracking-[0.16em] text-fg-muted">
        {toolCalls.length} local/private-sensitive tool call{toolCalls.length === 1 ? '' : 's'}
      </summary>
      <div className="mt-3 space-y-3">
        {toolCalls.map((toolCall, index) => (
          <div key={`${toolCall.id ?? 'tool'}:${index}`} className="rounded-md border border-border/60 bg-bg/45 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <DetailChip
                className="border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                label={toolCall.name ?? 'unknown tool'}
              />
              {toolCall.id ? <span className="font-mono text-xs text-fg-faint">{toolCall.id}</span> : null}
            </div>
            {toolCall.argumentsPreview ? (
              <>
                <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.14em] text-fg-faint">
                  Arguments preview may include local/private values
                </p>
                <pre className="mt-2 whitespace-pre-wrap break-words text-xs leading-6 text-fg-muted">
                  {toolCall.argumentsPreview}
                </pre>
              </>
            ) : null}
          </div>
        ))}
      </div>
    </details>
  );
}

function MessageCard({ message }: { message: SessionMessage }) {
  return (
    <article className="rounded-md border border-border/70 bg-bg/40 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <DetailChip className={roleClass(message.role)} label={message.role} />
          {message.toolName ? (
            <DetailChip className="border-emerald-500/30 bg-emerald-500/10 text-emerald-200" label={message.toolName} />
          ) : null}
          {message.finishReason ? (
            <DetailChip className="border-border/80 bg-bg/40 text-fg-muted" label={message.finishReason} />
          ) : null}
        </div>
        <div className="text-right text-xs text-fg-muted">
          <p>{formatTimestamp(message.timestamp)}</p>
          {message.tokenCount != null ? <p className="mt-1">{formatCount(message.tokenCount)} tokens</p> : null}
        </div>
      </div>

      {message.content ? (
        <>
          <pre className="mt-4 whitespace-pre-wrap break-words text-sm leading-7 text-fg">{message.content}</pre>
          {message.contentOmittedCharCount > 0 ? (
            <p className="mt-3 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm leading-6 text-amber-100">
              Content truncated by the local API; {formatCount(message.contentOmittedCharCount)} chars omitted from this
              message.
            </p>
          ) : null}
        </>
      ) : (
        <p className="mt-4 rounded-md border border-dashed border-border/70 p-3 text-sm text-fg-muted">
          No message content was recorded for this row.
        </p>
      )}

      <ToolCallDetails toolCalls={message.toolCalls} />
    </article>
  );
}

function MessageTimeline({ detail }: { detail: SessionDetail }) {
  const { messages, transcript } = detail;
  const entries = buildTimelineEntries(detail);
  const transcriptCopy = buildTranscriptCopy(entries);

  if (messages.length === 0) {
    return (
      <section className="rounded-lg border border-border bg-surface/70 p-4">
        <EmptyState
          eyebrow="Transcript"
          title="No message rows were returned"
          description="The session exists, but Hermes Console could not read transcript rows for it from the local state database."
        />
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-border bg-surface/70 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-[family-name:var(--font-bricolage)] text-base font-semibold text-fg-strong">
            Message timeline
          </h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-fg-muted">
            Local transcript content may include private prompts, tool results, and copied files. The API returned{' '}
            {formatCount(transcript.returnedMessageCount)} of {formatCount(transcript.totalMessageCount)} messages and
            omitted {formatCount(transcript.omittedContentCharCount)} content chars by default.
          </p>
        </div>
        <CopyButton ariaLabel="Copy visible local transcript" value={transcriptCopy} />
      </div>

      <div className="mt-4 space-y-3 xl:max-h-[70rem] xl:overflow-auto xl:pr-1">
        {entries.map((entry) =>
          entry.kind === 'message' ? (
            <MessageCard key={entry.message.id} message={entry.message} />
          ) : (
            <div
              key="omitted"
              className="rounded-md border border-dashed border-border/80 p-4 text-center text-sm leading-6 text-fg-muted"
            >
              {formatCount(entry.count)} middle messages omitted by the local API before this transcript reached the UI.
            </div>
          )
        )}
      </div>
    </section>
  );
}

export function SessionDetailView({ detail }: { detail: SessionDetail }) {
  const { session, stats } = detail;
  const totalComputedTokens =
    stats.inputTokens + stats.outputTokens + stats.cacheReadTokens + stats.cacheWriteTokens + stats.reasoningTokens;

  return (
    <div className="space-y-8">
      <section className="max-w-5xl space-y-4">
        <AppBreadcrumbs
          items={[
            {
              label: 'Sessions',
              to: '/sessions',
              search: {
                profile: session.agentId
              }
            },
            {
              label: session.title
            }
          ]}
        />
        <div className="flex flex-wrap items-center gap-3">
          <DetailChip className="border-accent/30 bg-accent/10 text-accent" label={session.agentLabel} />
          <DetailChip className="border-border/80 bg-bg/40 text-fg-muted" label={session.sourceLabel} />
          {session.model ? (
            <DetailChip className="border-sky-500/30 bg-sky-500/10 text-sky-200" label={session.model} />
          ) : null}
          {session.endReason ? (
            <DetailChip className="border-border/80 bg-bg/40 text-fg-muted" label={session.endReason} />
          ) : null}
        </div>
        <h2 className="font-[family-name:var(--font-bricolage)] text-xl font-semibold tracking-tight text-fg-strong sm:text-2xl">
          {session.title}
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <p className="break-all font-mono text-xs text-fg-muted">{session.sessionId}</p>
          <CopyButton ariaLabel="Copy session id" size="compact" value={session.sessionId} />
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="duration"
          value={formatDuration(stats.durationMs)}
          detail={`Started ${formatTimestamp(session.startedAt)}`}
        />
        <StatCard
          label="messages"
          value={formatCount(stats.messageCount)}
          detail={`${formatCount(stats.toolCallCount)} recorded tool calls`}
        />
        <StatCard
          label="tokens"
          value={formatCount(stats.totalTokens)}
          detail={`${formatCount(totalComputedTokens)} from state token columns`}
        />
        <StatCard
          label="cost"
          value={formatCost(stats.estimatedCostUsd)}
          detail={`Actual ${formatCost(stats.actualCostUsd)}`}
        />
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.84fr)_minmax(0,1.16fr)]">
        <section className="rounded-lg border border-border bg-surface/70 p-4">
          <h3 className="font-[family-name:var(--font-bricolage)] text-base font-semibold text-fg-strong">
            Session metadata
          </h3>
          <div className="mt-4 space-y-3">
            <MetadataBlock
              label="session id"
              value={session.sessionId}
              action={<CopyButton ariaLabel="Copy session id" size="compact" value={session.sessionId} />}
            />
            <MetadataBlock label="profile" value={session.agentLabel} />
            <MetadataBlock label="source" value={session.sourceLabel} />
            {session.model ? <MetadataBlock label="model" value={session.model} /> : null}
            {session.displayName ? <MetadataBlock label="display name" value={session.displayName} /> : null}
            {session.sessionKey ? <MetadataBlock label="session key" value={session.sessionKey} /> : null}
            {session.platform ? <MetadataBlock label="platform" value={session.platform} /> : null}
            {session.chatType ? <MetadataBlock label="chat type" value={session.chatType} /> : null}
            {session.cronJobName ? <MetadataBlock label="cron job" value={session.cronJobName} /> : null}
            {detail.lineage.parentSessionId ? (
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-fg-faint">parent session</p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <Link
                    params={{
                      agentId: session.agentId,
                      sessionId: detail.lineage.parentSessionId
                    }}
                    to="/sessions/$agentId/$sessionId"
                    className="break-all text-sm leading-6 text-accent transition-colors hover:text-fg-strong"
                  >
                    {detail.lineage.parentSessionId}
                  </Link>
                  <CopyButton
                    ariaLabel="Copy parent session id"
                    size="compact"
                    value={detail.lineage.parentSessionId}
                  />
                </div>
              </div>
            ) : null}
          </div>
        </section>

        <section className="rounded-lg border border-border bg-surface/70 p-4">
          <h3 className="font-[family-name:var(--font-bricolage)] text-base font-semibold text-fg-strong">
            Timing and usage
          </h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {[
              {
                label: 'started',
                value: formatTimestamp(session.startedAt)
              },
              {
                label: 'ended',
                value: formatTimestamp(session.endedAt)
              },
              {
                label: 'last activity',
                value: formatTimestamp(session.lastActivityAt)
              },
              {
                label: 'end reason',
                value: session.endReason ?? (session.endedAt ? 'unknown' : 'still active')
              },
              {
                label: 'input tokens',
                value: formatCount(stats.inputTokens)
              },
              {
                label: 'output tokens',
                value: formatCount(stats.outputTokens)
              },
              {
                label: 'cache read',
                value: formatCount(stats.cacheReadTokens)
              },
              {
                label: 'cache write',
                value: formatCount(stats.cacheWriteTokens)
              },
              {
                label: 'reasoning',
                value: formatCount(stats.reasoningTokens)
              },
              {
                label: 'cost status',
                value: session.costStatus ?? 'unknown'
              }
            ].map((item) => (
              <div key={item.label} className="rounded-md border border-border/70 bg-bg/40 p-3">
                <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-fg-faint">{item.label}</p>
                <p className="mt-2 break-words text-sm leading-6 text-fg">{item.value}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <MessageTimeline detail={detail} />
    </div>
  );
}
