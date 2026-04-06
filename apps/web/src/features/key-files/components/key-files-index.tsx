import { Link } from "@tanstack/react-router";

import { KeyFileKindBadge } from "@/features/key-files/components/key-file-kind-badge";
import type { KeyFileSummary } from "@hermes-console/runtime";
import { MemoryPressureBadge } from "@/features/memory/components/memory-pressure-badge";
import type { MemoryReadResult } from "@hermes-console/runtime";

function getMemoryPressureForFile({
  file,
  memory,
}: {
  file: KeyFileSummary;
  memory: MemoryReadResult;
}) {
  if (file.scope !== "hermes_root") {
    return null;
  }

  if (file.name === "MEMORY.md") {
    return memory.files.memory.pressureLevel;
  }

  if (file.name === "USER.md") {
    return memory.files.user.pressureLevel;
  }

  return null;
}

export function KeyFilesIndex({
  files,
  selectedFileId,
  memory,
}: {
  files: KeyFileSummary[];
  selectedFileId: string | null;
  memory: MemoryReadResult;
}) {
  const grouped = {
    hermes: files.filter((file) => file.scope === "hermes_root"),
    workspace: files.filter((file) => file.scope === "workspace_root"),
  };

  return (
    <div className="space-y-6">
      {[
        {
          id: "hermes",
          title: "Hermes root",
          description: "Native Hermes files discovered under the resolved runtime root.",
          files: grouped.hermes,
        },
        {
          id: "workspace",
          title: "Workspace root",
          description: "Markdown and instruction files from the bounded workspace scan.",
          files: grouped.workspace,
        },
      ].map((group) => (
        <section
          key={group.id}
          className={[
            "rounded-lg border border-border bg-surface/70 p-4",
            group.id === "workspace" ? "xl:max-h-[40rem] xl:overflow-auto" : "",
          ].join(" ")}
        >
          <div className="mb-4">
            <h3 className="font-[family-name:var(--font-bricolage)] text-base font-semibold text-fg-strong">
              {group.title}
            </h3>
            <p className="mt-2 text-sm leading-6 text-fg-muted">{group.description}</p>
          </div>

          <div className="space-y-3">
            {group.files.length > 0 ? (
              group.files.map((file) => {
                const pressureLevel = getMemoryPressureForFile({ file, memory });
                const isSelected = selectedFileId === file.id;

                return (
                  <Link
                    key={file.id}
                    search={{
                      file: file.id,
                    }}
                    to="/files"
                    className={[
                      "block rounded-md border p-3 transition-colors",
                      isSelected
                        ? "border-accent/60 bg-accent/5"
                        : "border-border/70 bg-bg/40 hover:border-border",
                    ].join(" ")}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-medium text-fg-strong">{file.name}</p>
                          <KeyFileKindBadge kind={file.kind} />
                          {pressureLevel ? <MemoryPressureBadge level={pressureLevel} /> : null}
                        </div>
                        <p className="mt-2 font-mono text-xs text-fg-muted">{file.relativePath}</p>
                      </div>
                      <div className="text-right text-xs text-fg-muted">
                        <p>{Math.max(1, Math.round(file.fileSize / 1024))} KB</p>
                      </div>
                    </div>
                  </Link>
                );
              })
            ) : (
              <div className="rounded-md border border-dashed border-border/80 p-3 text-sm leading-6 text-fg-muted">
                No matching high-signal files were discovered in this scope.
              </div>
            )}
          </div>
        </section>
      ))}
    </div>
  );
}
