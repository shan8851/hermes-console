import { RefreshButton } from "@/components/ui/refresh-button";
import { MemoryFilePanel } from "@/features/memory/components/memory-file-panel";
import { MemoryPressureBadge } from "@/features/memory/components/memory-pressure-badge";
import { MemorySummaryGrid } from "@/features/memory/components/memory-summary-grid";
import { readHermesMemory } from "@/features/memory/read-memory";
import { createSectionMetadata } from "@/lib/create-section-metadata";

export const metadata = createSectionMetadata(
  "Memory",
  "Memory files, usage, and saved blocks.",
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
          ? "Both memory files found."
          : memory.status === "partial"
            ? "One memory file found, the other is missing."
            : "No memory files found.",
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
      detail: `${memory.files.memory.entries.length} memory + ${memory.files.user.entries.length} user entries`,
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
          <RefreshButton loadedAt={new Date().toISOString()} />
        </div>
        <h2 className="mt-3 font-[family-name:var(--font-bricolage)] text-xl font-semibold tracking-tight text-fg-strong sm:text-2xl">
          Saved Memory
        </h2>
        <p className="mt-3 text-sm leading-7 text-fg-muted">
          Hermes stores durable memory in plain markdown files. This page shows current usage against configured limits and the saved blocks parsed out of those files.
        </p>
      </section>

      <MemorySummaryGrid items={summaryItems} />

      <div className="grid gap-6 xl:grid-cols-2">
        <MemoryFilePanel file={memory.files.memory} limitSource={memory.limits.memory.source} />
        <MemoryFilePanel file={memory.files.user} limitSource={memory.limits.user.source} />
      </div>
    </div>
  );
}
