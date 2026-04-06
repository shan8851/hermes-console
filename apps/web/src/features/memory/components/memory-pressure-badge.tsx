import type { MemoryPressureLevel } from "@hermes-console/runtime";

const LABELS: Record<MemoryPressureLevel, string> = {
  healthy: "healthy",
  approaching_limit: "watching",
  near_limit: "near limit",
  at_limit: "at limit",
};

const TONE_CLASSES: Record<MemoryPressureLevel, string> = {
  healthy: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  approaching_limit: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  near_limit: "border-orange-500/30 bg-orange-500/10 text-orange-300",
  at_limit: "border-rose-500/30 bg-rose-500/10 text-rose-300",
};

export function MemoryPressureBadge({ level }: { level: MemoryPressureLevel }) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full border px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.16em]",
        TONE_CLASSES[level],
      ].join(" ")}
    >
      {LABELS[level]}
    </span>
  );
}
