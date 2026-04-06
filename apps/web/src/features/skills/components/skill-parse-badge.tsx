import type { SkillParseStatus } from "@hermes-console/runtime";

const LABELS: Record<SkillParseStatus, string> = {
  valid: "valid",
  malformed: "malformed",
};

const TONES: Record<SkillParseStatus, string> = {
  valid: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  malformed: "border-amber-500/30 bg-amber-500/10 text-amber-300",
};

export function SkillParseBadge({ status }: { status: SkillParseStatus }) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full border px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.16em]",
        TONES[status],
      ].join(" ")}
    >
      {LABELS[status]}
    </span>
  );
}
