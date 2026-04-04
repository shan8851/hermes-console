import { MemoryFilePanel } from "@/features/memory/components/memory-file-panel";
import { MemoryPressureBadge } from "@/features/memory/components/memory-pressure-badge";
import { MemorySummaryGrid } from "@/features/memory/components/memory-summary-grid";
import { readHermesMemory } from "@/features/memory/read-memory";
import { createSectionMetadata } from "@/lib/create-section-metadata";

export const metadata = createSectionMetadata(
  "Memory",
  "USER and MEMORY surfaces with usage indicators.",
);

function getOverallPressureLevel(memory: ReturnType<typeof readHermesMemory>) {
  if (
    memory.files.memory.pressureLevel === "at_limit" ||
    memory.files.user.pressureLevel === "at_limit"
  ) {
    return "at_limit";
  }

  if (
    memory.files.memory.pressureLevel === "near_limit" ||
    memory.files.user.pressureLevel === "near_limit"
  ) {
    return "near_limit";
  }

  if (
    memory.files.memory.pressureLevel === "approaching_limit" ||
    memory.files.user.pressureLevel === "approaching_limit"
  ) {
    return "approaching_limit";
  }

  return "healthy";
}

export default function MemoryPage() {
  const memory = readHermesMemory();
  const overallPressure = getOverallPressureLevel(memory);

  const summaryItems = [
    {
      label: "status",
      value:
        memory.status === "ready" ? "✓ OK" : memory.status === "partial" ? "~ Partial" : "Missing",
      detail:
        memory.status === "ready"
          ? "Both memory files were found and parsed."
          : memory.status === "partial"
            ? "One surface exists, but the other is missing."
            : "No memory files were found under the resolved Hermes root.",
      tone: "default" as const,
    },
    {
      label: "memory",
      value: `${memory.files.memory.usagePercentage}%`,
      detail: `${memory.files.memory.charCount}/${memory.files.memory.limit} chars used`,
      tone: "default" as const,
    },
    {
      label: "user",
      value: `${memory.files.user.usagePercentage}%`,
      detail: `${memory.files.user.charCount}/${memory.files.user.limit} chars used`,
      tone: "default" as const,
    },
    {
      label: "saved blocks",
      value: String(memory.files.memory.entries.length + memory.files.user.entries.length),
      detail: `${memory.files.memory.entries.length} durable + ${memory.files.user.entries.length} user blocks`,
      tone: "default" as const,
    },
  ];

  return (
    <div className="space-y-8">
      <section className="max-w-3xl">
        <div className="flex flex-wrap items-center gap-3">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-accent">
            Memory
          </p>
          <MemoryPressureBadge level={overallPressure} />
        </div>
        <h2 className="mt-3 font-[family-name:var(--font-bricolage)] text-xl font-semibold tracking-tight text-fg-strong sm:text-2xl">
          See what Hermes has actually saved from working with you
        </h2>
        <p className="mt-3 text-sm leading-7 text-fg-muted">
          Hermes keeps durable memory in real markdown files rather than a hidden black box. This
          page shows the current files, their pressure against configured limits, and the saved
          blocks that have been captured over time.
        </p>
      </section>

      <MemorySummaryGrid items={summaryItems} />

      <section className="rounded-lg border border-border bg-surface/70 p-4">
        <h3 className="font-[family-name:var(--font-bricolage)] text-base font-semibold text-fg-strong">
          File model
        </h3>
        <ul className="mt-3 space-y-2 text-sm leading-6 text-fg-muted">
          <li>
            - <span className="font-mono text-xs text-fg">MEMORY.md</span> and <span className="font-mono text-xs text-fg">USER.md</span> are the real source files.
          </li>
          <li>
            - We parse <span className="font-mono text-xs text-fg">§</span>-separated sections into
            saved blocks so the file stays scannable instead of becoming one giant wall.
          </li>
          <li>
            - Limits currently resolve from <span className="font-mono text-xs text-fg">config.yaml</span> when available, otherwise they fall back to defaults.
          </li>
        </ul>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <MemoryFilePanel file={memory.files.memory} limitSource={memory.limits.memory.source} />
        <MemoryFilePanel file={memory.files.user} limitSource={memory.limits.user.source} />
      </div>
    </div>
  );
}
