import { MemoryPressureBadge } from "@/features/memory/components/memory-pressure-badge";
import type { MemoryFileSummary } from "@/features/memory/types";

function formatLimitSource(source: MemoryFileSummary["scope"] | "config" | "default") {
  if (source === "config") {
    return "config";
  }

  if (source === "default") {
    return "default";
  }

  return source;
}

function getEntryLabel(index: number) {
  return `Block ${index + 1}`;
}

function getDisplayLabel(file: MemoryFileSummary) {
  return `${file.label}.md`;
}

export function MemoryFilePanel({
  file,
  limitSource,
}: {
  file: MemoryFileSummary;
  limitSource: "config" | "default";
}) {
  return (
    <section className="rounded-lg border border-border bg-surface/70 p-4 xl:h-[56rem] xl:overflow-auto">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-fg-faint">
            {getDisplayLabel(file)}
          </p>
          <h3 className="mt-2 font-[family-name:var(--font-bricolage)] text-lg font-semibold text-fg-strong">
            {file.exists
              ? `${file.entries.length} saved blocks · ${file.charCount}/${file.limit}`
              : "file missing"}
          </h3>
          <p className="mt-2 text-sm leading-6 text-fg-muted">{file.filePath}</p>
          {file.exists ? (
            <p className="mt-2 text-sm leading-6 text-fg-muted">
              Hermes stores this as one markdown file. The blocks below are parsed from saved
              sections so you can scan what has been captured over time.
            </p>
          ) : null}
        </div>
        <MemoryPressureBadge level={file.pressureLevel} />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-md border border-border/70 bg-bg/40 p-3">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-fg-faint">
            usage
          </p>
          <p className="mt-2 font-[family-name:var(--font-bricolage)] text-xl font-semibold text-fg-strong">
            {file.usagePercentage}%
          </p>
        </div>
        <div className="rounded-md border border-border/70 bg-bg/40 p-3">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-fg-faint">
            limit source
          </p>
          <p className="mt-2 text-sm text-fg-strong">{formatLimitSource(limitSource)}</p>
        </div>
        <div className="rounded-md border border-border/70 bg-bg/40 p-3">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-fg-faint">
            pressure
          </p>
          <p className="mt-2 text-sm text-fg-strong">{file.pressureLevel.replaceAll("_", " ")}</p>
        </div>
      </div>

      {file.exists ? (
        <>
          {file.preamble ? (
            <div className="mt-4 rounded-md border border-border/70 bg-bg/40 p-3">
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-fg-faint">
                file preamble
              </p>
              <pre className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-fg-muted">
                {file.preamble}
              </pre>
            </div>
          ) : null}

          <div className="mt-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-fg-faint">
                parsed saved blocks
              </p>
              <p className="text-xs text-fg-muted">ordered from the file, not native Hermes IDs</p>
            </div>

            {file.entries.length > 0 ? (
              <div className="space-y-3">
                {file.entries.map((entry, index) => (
                  <article key={entry.id} className="rounded-md border border-border/70 bg-bg/40 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-fg-faint">
                        {getEntryLabel(index)}
                      </p>
                      <p className="text-xs text-fg-muted">{entry.charCount} chars</p>
                    </div>
                    <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-fg">
                      {entry.content}
                    </p>
                  </article>
                ))}
              </div>
            ) : (
              <div className="rounded-md border border-dashed border-border/80 p-3 text-sm leading-6 text-fg-muted">
                The file exists, but there are no parsed saved blocks yet.
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="mt-4 rounded-md border border-dashed border-border/80 p-3 text-sm leading-6 text-fg-muted">
          This surface was not found under the resolved Hermes root.
        </div>
      )}
    </section>
  );
}
