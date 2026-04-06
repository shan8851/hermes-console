import type { SkillLinkedFileKind } from "@hermes-console/runtime";

const LABELS: Record<SkillLinkedFileKind, string> = {
  reference: "reference",
  template: "template",
  script: "script",
  asset: "asset",
};

export function LinkedFileKindBadge({ kind }: { kind: SkillLinkedFileKind }) {
  return (
    <span className="inline-flex items-center rounded-full border border-border/80 bg-bg/40 px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.16em] text-fg-muted">
      {LABELS[kind]}
    </span>
  );
}
