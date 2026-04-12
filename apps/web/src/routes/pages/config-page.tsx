import { useMemo, useRef, useState } from 'react';
import { useSuspenseQuery } from '@tanstack/react-query';
import hljs from 'highlight.js/lib/core';
import yaml from 'highlight.js/lib/languages/yaml';

import { QueryStatusCard } from '@/components/ui/query-status-card';
import { configQueryOptions } from '@/lib/api';

hljs.registerLanguage('yaml', yaml);

export function ConfigPage() {
  const query = useSuspenseQuery(configQueryOptions());
  const data = query.data.data;
  const files = data.files;

  const [selectedIdx, setSelectedIdx] = useState(0);
  const activeFile = files[selectedIdx] ?? files[0];
  const codeRef = useRef<HTMLElement>(null);

  const highlighted = useMemo(() => {
    if (!activeFile?.content) return '';
    return hljs.highlight(activeFile.content, { language: 'yaml' }).value;
  }, [activeFile?.content]);

  if (files.length === 0) {
    return (
      <div className="space-y-6">
        <QueryStatusCard title="Config read quality" status={query.data.meta.dataStatus} issues={query.data.issues} />
        <p className="text-sm text-fg-muted">No config files found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <QueryStatusCard title="Config read quality" status={query.data.meta.dataStatus} issues={query.data.issues} />

      <div>
        <h2 className="font-[family-name:var(--font-bricolage)] text-lg font-semibold text-fg-strong">
          Configuration
        </h2>
        <p className="mt-1 text-sm text-fg-muted">
          Runtime config for each discovered agent.
        </p>
      </div>

      {/* Agent tabs */}
      {files.length > 1 && (
        <div className="flex gap-1 rounded-lg border border-border bg-bg/40 p-1">
          {files.map((file, idx) => (
            <button
              key={file.agentId}
              onClick={() => setSelectedIdx(idx)}
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
        <pre className="max-h-[600px] overflow-auto rounded-lg bg-bg/60 p-4 text-xs leading-5">
          <code
            ref={codeRef}
            className="language-yaml hljs"
            dangerouslySetInnerHTML={{ __html: highlighted || 'File not found' }}
          />
        </pre>
      </section>
    </div>
  );
}
