import type {
  HermesQueryIssue,
  HermesQueryStatus,
  SkillDocumentDetail,
  SkillLinkedFileContent,
  SnapshotEnvelope
} from '@hermes-console/runtime';

import { AppBreadcrumbs } from '@/components/ui/app-breadcrumbs';
import { CopyButton } from '@/components/ui/copy-button';
import { EmptyState } from '@/components/ui/empty-state';
import { QueryStatusCard } from '@/components/ui/query-status-card';
import { LinkedFileKindBadge } from '@/features/skills/components/linked-file-kind-badge';
import { SkillParseBadge } from '@/features/skills/components/skill-parse-badge';
import { Link } from '@tanstack/react-router';

function createViewerLink({ skillId, file }: { skillId: string; file: string }) {
  return {
    params: {
      skillId
    },
    search: file === 'skill' ? {} : { file }
  };
}

export function SkillFileViewer({
  detail,
  detailIssues,
  detailStatus,
  selectedFileId,
  selectedLinkedFile,
  selectedLinkedFileError
}: {
  detail: SkillDocumentDetail;
  detailIssues: HermesQueryIssue[];
  detailStatus: HermesQueryStatus;
  selectedFileId: string | null;
  selectedLinkedFile: SnapshotEnvelope<SkillLinkedFileContent> | null;
  selectedLinkedFileError: string | null;
}) {
  const effectiveSelectedFileId = selectedFileId ?? 'skill';
  const files = [
    {
      id: 'skill',
      title: 'SKILL.md',
      subtitle: detail.summary.skillPath,
      badge: null
    },
    ...detail.summary.linkedFiles.map((linkedFile) => ({
      id: linkedFile.id,
      title: linkedFile.relativePath,
      subtitle: linkedFile.absolutePath,
      badge: <LinkedFileKindBadge kind={linkedFile.kind} key={linkedFile.id} />
    }))
  ];

  const previewTitle =
    effectiveSelectedFileId === 'skill' ? 'SKILL.md' : (selectedLinkedFile?.data.file.relativePath ?? 'Linked file');
  const previewContent =
    effectiveSelectedFileId === 'skill'
      ? detail.rawContent
      : (selectedLinkedFile?.data.content ?? 'This linked file could not be read as text.');

  return (
    <div className="space-y-8">
      <QueryStatusCard title="Skill detail quality" status={detailStatus} issues={detailIssues} />
      <section className="max-w-3xl">
        <AppBreadcrumbs items={[{ label: 'Skills', to: '/skills' }, { label: detail.summary.name }]} />
        <div className="flex flex-wrap items-center gap-3">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-accent">Skills</p>
          <SkillParseBadge status={detail.summary.parseStatus} />
        </div>
        <h2 className="mt-3 font-[family-name:var(--font-bricolage)] text-xl font-semibold tracking-tight text-fg-strong sm:text-2xl">
          {detail.summary.name}
        </h2>
        <p className="mt-3 text-sm leading-7 text-fg-muted">{detail.summary.description}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <p className="break-all font-mono text-xs text-fg-muted">{detail.summary.skillPath}</p>
          <CopyButton ariaLabel="Copy skill file path" value={detail.summary.skillPath} />
        </div>
        <div className="mt-4 flex flex-wrap gap-2 text-xs text-fg-muted">
          <span className="rounded-full border border-border/80 bg-bg/40 px-3 py-1 font-mono">
            category {detail.summary.category}
          </span>
          <span className="rounded-full border border-border/80 bg-bg/40 px-3 py-1 font-mono">
            {detail.summary.linkedFiles.length} linked files
          </span>
          <Link
            to="/skills"
            className="rounded-full border border-border/80 bg-bg/40 px-3 py-1 font-mono transition-colors hover:border-accent/60"
          >
            back to skills
          </Link>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.72fr)_minmax(0,1.28fr)]">
        <section className="rounded-lg border border-border bg-surface/70 p-4 xl:max-h-[50rem] xl:overflow-auto">
          <div className="mb-4">
            <h3 className="font-[family-name:var(--font-bricolage)] text-base font-semibold text-fg-strong">
              Skill files
            </h3>
            <p className="mt-2 text-sm leading-6 text-fg-muted">
              Select the main skill file or any linked reference/template/script.
            </p>
          </div>

          <div className="space-y-3">
            {files.map((file) => {
              const isSelected = file.id === effectiveSelectedFileId;

              return (
                <Link
                  key={file.id}
                  {...createViewerLink({
                    skillId: detail.summary.id,
                    file: file.id
                  })}
                  to="/skills/$skillId"
                  className={[
                    'block rounded-md border p-3 transition-colors',
                    isSelected ? 'border-accent/60 bg-accent/5' : 'border-border/70 bg-bg/40 hover:border-border'
                  ].join(' ')}
                >
                  <div className="flex items-start justify-between gap-3 min-w-0">
                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <p className="min-w-0 break-all text-sm font-medium text-fg-strong">{file.title}</p>
                        {file.badge}
                      </div>
                      <p className="mt-2 break-all font-mono text-xs text-fg-muted">{file.subtitle}</p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        <section className="rounded-lg border border-border bg-surface/70 p-4">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h3 className="min-w-0 break-all font-[family-name:var(--font-bricolage)] text-base font-semibold text-fg-strong">
              {previewTitle}
            </h3>
            {effectiveSelectedFileId !== 'skill' && selectedLinkedFile?.data.file ? (
              <LinkedFileKindBadge kind={selectedLinkedFile.data.file.kind} />
            ) : null}
          </div>
          {effectiveSelectedFileId !== 'skill' && selectedLinkedFile?.data.file ? (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <p className="break-all font-mono text-xs text-fg-muted">{selectedLinkedFile.data.file.absolutePath}</p>
              <CopyButton ariaLabel="Copy linked file path" value={selectedLinkedFile.data.file.absolutePath} />
            </div>
          ) : null}
          {effectiveSelectedFileId !== 'skill' && selectedLinkedFile ? (
            <QueryStatusCard
              title="Linked file quality"
              status={selectedLinkedFile?.meta.dataStatus ?? 'ready'}
              issues={selectedLinkedFile?.issues ?? []}
            />
          ) : null}
          {selectedLinkedFileError ? (
            <div className="mt-4">
              <EmptyState
                eyebrow="Unreadable"
                title="This linked file could not be loaded"
                description={selectedLinkedFileError}
                tone="danger"
              />
            </div>
          ) : (
            <pre className="mt-4 max-h-[56rem] overflow-auto whitespace-pre-wrap break-words text-sm leading-6 text-fg">
              {previewContent}
            </pre>
          )}
        </section>
      </div>
    </div>
  );
}
