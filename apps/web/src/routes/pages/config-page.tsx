import { useMemo, useState } from 'react';
import { useSuspenseQuery } from '@tanstack/react-query';
import hljs from 'highlight.js/lib/core';
import yaml from 'highlight.js/lib/languages/yaml';

import { QueryStatusCard } from '@/components/ui/query-status-card';
import { configQueryOptions } from '@/lib/api';

import type { HermesConfigFile, HermesQueryIssue, HermesQueryStatus } from '@hermes-console/runtime';

hljs.registerLanguage('yaml', yaml);

export function ConfigPage() {
  const query = useSuspenseQuery(configQueryOptions());
  const [selectedIdx, setSelectedIdx] = useState(0);
  const files = query.data.data.files;
  const firstFile = files[0];

  if (!firstFile) {
    return (
      <div className="space-y-6">
        <QueryStatusCard title="Config read quality" status={query.data.meta.dataStatus} issues={query.data.issues} />
        <p className="text-sm text-fg-muted">No config files found.</p>
      </div>
    );
  }

  const activeFile = files[selectedIdx] ?? firstFile;

  return (
    <ConfigViewer
      files={files}
      activeFile={activeFile}
      selectedIdx={selectedIdx}
      onSelect={setSelectedIdx}
      issues={query.data.issues}
      status={query.data.meta.dataStatus}
    />
  );
}

function ConfigViewer({
  files,
  activeFile,
  selectedIdx,
  onSelect,
  issues,
  status
}: {
  files: HermesConfigFile[];
  activeFile: HermesConfigFile;
  selectedIdx: number;
  onSelect: (idx: number) => void;
  issues: HermesQueryIssue[];
  status: HermesQueryStatus;
}) {
  const highlighted = useMemo(() => {
    if (activeFile.readStatus !== 'ready' || activeFile.content == null) return '';
    return hljs.highlight(activeFile.content, { language: 'yaml' }).value;
  }, [activeFile.content, activeFile.readStatus]);

  return (
    <div className="space-y-6">
      <QueryStatusCard title="Config read quality" status={status} issues={issues} />

      <div>
        <h2 className="font-(family-name:--font-bricolage) text-lg font-semibold text-fg-strong">Configuration</h2>
        <p className="mt-1 text-sm text-fg-muted">Runtime config for each discovered agent.</p>
      </div>

      {/* Agent tabs */}
      {files.length > 1 && (
        <div className="flex gap-1 rounded-lg border border-border bg-bg/40 p-1">
          {files.map((file, idx) => (
            <button
              key={file.agentId}
              onClick={() => onSelect(idx)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                idx === selectedIdx ? 'bg-surface text-fg-strong shadow-sm' : 'text-fg-muted hover:text-fg-strong'
              }`}
            >
              {file.agentLabel}
              <span className="ml-1.5 text-fg-faint">{file.agentSource === 'root' ? '(root)' : '(profile)'}</span>
            </button>
          ))}
        </div>
      )}

      {/* YAML with syntax highlighting */}
      <section className="rounded-xl border border-border bg-surface/70 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-mono text-[11px] uppercase tracking-[0.18em] text-fg-faint">config.yaml</h3>
          <span className="text-xs text-fg-faint">{activeFile.path}</span>
        </div>
        <ConfigFileBody activeFile={activeFile} highlighted={highlighted} />
      </section>
    </div>
  );
}

function ConfigFileBody({ activeFile, highlighted }: { activeFile: HermesConfigFile; highlighted: string }) {
  if (activeFile.readStatus === 'missing') {
    return (
      <ConfigStatePanel
        title="config.yaml not found"
        detail="Hermes Console did not find config.yaml under this agent root."
      />
    );
  }

  if (activeFile.readStatus === 'unreadable') {
    return (
      <ConfigStatePanel
        title="config.yaml could not be read"
        detail={activeFile.readDetail ?? 'Hermes Console could not read config.yaml under this agent root.'}
      />
    );
  }

  return (
    <pre className="max-h-150 overflow-auto rounded-lg bg-bg/60 p-4 text-xs leading-5">
      <code className="language-yaml hljs" dangerouslySetInnerHTML={{ __html: highlighted }} />
    </pre>
  );
}

function ConfigStatePanel({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="rounded-lg border border-border bg-bg/40 p-4">
      <p className="text-sm font-medium text-fg-strong">{title}</p>
      <p className="mt-2 text-sm leading-6 text-fg-muted">{detail}</p>
    </div>
  );
}
