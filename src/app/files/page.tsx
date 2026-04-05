import { RefreshButton } from "@/components/ui/refresh-button";
import { KeyFilePreview } from "@/features/key-files/components/key-file-preview";
import { KeyFilesIndex } from "@/features/key-files/components/key-files-index";
import { KeyFilesSummaryGrid } from "@/features/key-files/components/key-files-summary-grid";
import { readKeyFileContent } from "@/features/key-files/read-key-file-content";
import { readKeyFiles } from "@/features/key-files/read-key-files";
import { readHermesMemory } from "@/features/memory/read-memory";
import { createSectionMetadata } from "@/lib/create-section-metadata";

export const metadata = createSectionMetadata(
  "Files",
  "High-signal context and configuration files.",
);

export default async function FilesPage({
  searchParams,
}: {
  searchParams?: Promise<{ file?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const keyFiles = readKeyFiles();
  const memory = readHermesMemory();
  const selected = readKeyFileContent(params.file ?? "");

  const summaryItems = [
    {
      label: "files discovered",
      value: String(keyFiles.files.length),
      detail: "High-signal files across the Hermes root and bounded workspace scope.",
      tone: "default" as const,
    },
    {
      label: "hermes root",
      value: String(keyFiles.files.filter((file) => file.scope === "hermes_root").length),
      detail: "Files under the Hermes root.",
      tone: "default" as const,
    },
    {
      label: "workspace root",
      value: String(keyFiles.files.filter((file) => file.scope === "workspace_root").length),
      detail: "Markdown and instruction files pulled from the configured workspace scope.",
      tone: "default" as const,
    },
  ];

  return (
    <div className="space-y-8">
      <section className="max-w-3xl">
        <div className="flex flex-wrap items-center gap-3">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-accent">
            Files
          </p>
          <RefreshButton loadedAt={new Date().toISOString()} />
        </div>
        <h2 className="mt-3 font-[family-name:var(--font-bricolage)] text-xl font-semibold tracking-tight text-fg-strong sm:text-2xl">
          Key Files
        </h2>
        <p className="mt-3 text-sm leading-7 text-fg-muted">
          The files most likely to shape how Hermes behaves: runtime config under the Hermes root plus a tight set of useful workspace instructions and markdown.
        </p>
        <div className="mt-4 flex flex-wrap gap-2 text-xs text-fg-muted">
          <span className="rounded-full border border-border/80 bg-bg/40 px-3 py-1 font-mono">
            workspace {keyFiles.roots.workspaceRoot}
          </span>
          <span className="rounded-full border border-border/80 bg-bg/40 px-3 py-1 font-mono">
            hermes {keyFiles.roots.hermesRoot}
          </span>
        </div>
      </section>

      <KeyFilesSummaryGrid items={summaryItems} />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.82fr)_minmax(0,1.38fr)]">
        <KeyFilesIndex files={keyFiles.files} selectedFileId={selected?.file.id ?? null} memory={memory} />
        <KeyFilePreview file={selected?.file ?? null} content={selected?.content ?? null} memory={memory} />
      </div>
    </div>
  );
}
