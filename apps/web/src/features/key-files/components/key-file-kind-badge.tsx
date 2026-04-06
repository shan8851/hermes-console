import type { KeyFileKind } from "@hermes-console/runtime";

const LABELS: Record<KeyFileKind, string> = {
  memory: "memory",
  identity: "identity",
  instruction: "instruction",
};

export function KeyFileKindBadge({ kind }: { kind: KeyFileKind }) {
  return (
    <span className="inline-flex items-center rounded-full border border-border/80 bg-bg/40 px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.16em] text-fg-muted">
      {LABELS[kind]}
    </span>
  );
}
