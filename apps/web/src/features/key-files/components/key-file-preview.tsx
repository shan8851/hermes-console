import { CopyButton } from '@/components/ui/copy-button';
import { EmptyState } from '@/components/ui/empty-state';
import type { KeyFileContentData, KeyFileSummary, SnapshotEnvelope } from '@hermes-console/runtime';

import { QueryStatusCard } from '@/components/ui/query-status-card';
import { KeyFileKindBadge } from '@/features/key-files/components/key-file-kind-badge';
import { MemoryPressureBadge } from '@/features/memory/components/memory-pressure-badge';
import type { MemoryReadResult } from '@hermes-console/runtime';

function formatScope(scope: KeyFileSummary['scope']) {
  return scope === 'hermes_root' ? 'Hermes root' : 'Workspace root';
}

function formatDate(value: number) {
  return new Date(value).toLocaleString();
}

function getPressure(file: KeyFileSummary, memory: MemoryReadResult) {
  if (file.scope !== 'hermes_root') {
    return null;
  }

  if (file.name === 'MEMORY.md') {
    return memory.files.memory.pressureLevel;
  }

  if (file.name === 'USER.md') {
    return memory.files.user.pressureLevel;
  }

  return null;
}

export function KeyFilePreview({
  memory,
  selectedFile,
  selectedFileError,
  selectedFileId
}: {
  memory: MemoryReadResult;
  selectedFile: SnapshotEnvelope<KeyFileContentData> | null;
  selectedFileError: string | null;
  selectedFileId: string | null;
}) {
  const file = selectedFile?.data.file ?? null;
  const content = selectedFile?.data.content ?? null;

  if (selectedFileId && selectedFileError) {
    return (
      <section className="rounded-lg border border-border bg-surface/70 p-4">
        <EmptyState eyebrow="Unreadable" title="This file preview could not be loaded" description={selectedFileError} tone="danger" />
      </section>
    );
  }

  if (!file) {
    return (
      <section className="rounded-lg border border-border bg-surface/70 p-4">
        <EmptyState
          eyebrow="Select a file"
          title="Pick a file to preview"
          description="Choose a file from the left to inspect its raw contents and metadata."
        />
      </section>
    );
  }

  const pressureLevel = getPressure(file, memory);

  return (
    <section className="rounded-lg border border-border bg-surface/70 p-4">
      <QueryStatusCard
        title="Selected file"
        status={selectedFile?.meta.dataStatus ?? 'ready'}
        issues={selectedFile?.issues ?? []}
      />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-[family-name:var(--font-bricolage)] text-lg font-semibold text-fg-strong">
              {file.name}
            </h3>
            <KeyFileKindBadge kind={file.kind} />
            {pressureLevel ? <MemoryPressureBadge level={pressureLevel} /> : null}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <p className="break-all font-mono text-xs text-fg-muted">{file.path}</p>
            <CopyButton ariaLabel="Copy file path" value={file.path} />
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-md border border-border/70 bg-bg/40 p-3">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-fg-faint">scope</p>
          <p className="mt-2 text-sm text-fg-strong">{formatScope(file.scope)}</p>
        </div>
        <div className="rounded-md border border-border/70 bg-bg/40 p-3">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-fg-faint">size</p>
          <p className="mt-2 text-sm text-fg-strong">{file.fileSize} bytes</p>
        </div>
        <div className="rounded-md border border-border/70 bg-bg/40 p-3">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-fg-faint">modified</p>
          <p className="mt-2 text-sm text-fg-strong">{formatDate(file.lastModifiedMs)}</p>
        </div>
      </div>

      <div className="mt-4 rounded-md border border-border/70 bg-bg/40 p-3">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-fg-faint">preview</p>
        {content ? (
          <pre className="mt-3 max-h-[36rem] overflow-auto whitespace-pre-wrap break-words text-sm leading-6 text-fg">
            {content}
          </pre>
        ) : (
          <div className="mt-3">
            <EmptyState
              eyebrow="Unreadable"
              title="This file could not be read as text"
              description="The selected file exists, but the current filesystem reader could not load it as UTF-8 text."
            />
          </div>
        )}
      </div>
    </section>
  );
}
