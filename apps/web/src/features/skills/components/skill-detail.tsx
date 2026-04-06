import { Link } from "@tanstack/react-router";

import { LinkedFileKindBadge } from "@/features/skills/components/linked-file-kind-badge";
import { SkillParseBadge } from "@/features/skills/components/skill-parse-badge";
import type { SkillDetail } from "@hermes-console/runtime";

function createSkillLink({
  skillId,
  linkedFileId,
}: {
  skillId: string;
  linkedFileId?: string | null;
}) {
  return {
    params: {
      skillId: encodeURIComponent(skillId),
    },
    search: linkedFileId
      ? {
          file: linkedFileId,
        }
      : {},
  };
}

export function SkillDetailPanel({
  detail,
}: {
  detail: SkillDetail | null;
}) {
  if (!detail) {
    return (
      <section className="rounded-lg border border-border bg-surface/70 p-4">
        <div className="rounded-md border border-dashed border-border/80 p-4 text-sm leading-6 text-fg-muted">
          No skills were discovered under the current Hermes root.
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-border bg-surface/70 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-[family-name:var(--font-bricolage)] text-lg font-semibold text-fg-strong">
              {detail.summary.name}
            </h3>
            <SkillParseBadge status={detail.summary.parseStatus} />
          </div>
          <p className="mt-2 text-sm leading-6 text-fg-muted">{detail.summary.description}</p>
          <p className="mt-2 font-mono text-xs text-fg-muted">{detail.summary.skillPath}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-md border border-border/70 bg-bg/40 p-3">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-fg-faint">category</p>
          <p className="mt-2 text-sm text-fg-strong">{detail.summary.category}</p>
        </div>
        <div className="rounded-md border border-border/70 bg-bg/40 p-3">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-fg-faint">linked files</p>
          <p className="mt-2 text-sm text-fg-strong">{detail.summary.linkedFiles.length}</p>
        </div>
        <div className="rounded-md border border-border/70 bg-bg/40 p-3">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-fg-faint">parse status</p>
          <p className="mt-2 text-sm text-fg-strong">{detail.summary.parseStatus}</p>
        </div>
      </div>

      <div className="mt-4 rounded-md border border-border/70 bg-bg/40 p-3">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-fg-faint">skill body</p>
        <pre className="mt-3 max-h-[28rem] overflow-auto whitespace-pre-wrap break-words text-sm leading-6 text-fg">
          {detail.body}
        </pre>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,0.72fr)_minmax(0,1.28fr)]">
        <div className="rounded-md border border-border/70 bg-bg/40 p-3 xl:max-h-[26rem] xl:overflow-auto">
          <div className="mb-3">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-fg-faint">linked files</p>
          </div>

          {detail.summary.linkedFiles.length > 0 ? (
            <div className="space-y-3">
              {detail.summary.linkedFiles.map((linkedFile) => {
                const isSelected = detail.selectedLinkedFile?.id === linkedFile.id;

                return (
                  <Link
                    key={linkedFile.id}
                    {...createSkillLink({
                      skillId: detail.summary.id,
                      linkedFileId: linkedFile.id,
                    })}
                    to="/skills/$skillId"
                    className={[
                      "block rounded-md border p-3 transition-colors",
                      isSelected
                        ? "border-accent/60 bg-accent/5"
                        : "border-border/70 bg-surface/70 hover:border-border",
                    ].join(" ")}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <LinkedFileKindBadge kind={linkedFile.kind} />
                      <p className="font-mono text-xs text-fg-muted">{linkedFile.relativePath}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="rounded-md border border-dashed border-border/80 p-3 text-sm leading-6 text-fg-muted">
              No linked files were found for this skill.
            </div>
          )}
        </div>

        <div className="rounded-md border border-border/70 bg-bg/40 p-3">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-fg-faint">linked file preview</p>
          {detail.selectedLinkedFile ? (
            <>
              <p className="mt-3 font-mono text-xs text-fg-muted">{detail.selectedLinkedFile.relativePath}</p>
              <pre className="mt-3 max-h-[28rem] overflow-auto whitespace-pre-wrap break-words text-sm leading-6 text-fg">
                {detail.selectedLinkedFileContent ?? "This linked file could not be read as text."}
              </pre>
            </>
          ) : (
            <div className="mt-3 rounded-md border border-dashed border-border/80 p-3 text-sm leading-6 text-fg-muted">
              Select a linked file to preview it here.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
