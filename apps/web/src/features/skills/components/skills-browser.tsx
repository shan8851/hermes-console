import type { QueryKey } from '@tanstack/react-query';
import { useDeferredValue, useMemo, useState } from 'react';

import { AppSelect } from '@/components/ui/app-select';
import { EmptyState } from '@/components/ui/empty-state';
import { RefreshButton } from '@/components/ui/refresh-button';
import { SearchInput } from '@/components/ui/search-input';
import { SkillsIndex } from '@/features/skills/components/skills-index';
import { SkillsSummaryGrid } from '@/features/skills/components/skills-summary-grid';
import type { SkillSummary } from '@hermes-console/runtime';

function filterSkills({
  skills,
  query,
  category,
  parseStatus
}: {
  skills: SkillSummary[];
  query: string;
  category: string;
  parseStatus: string;
}) {
  const normalizedQuery = query.trim().toLowerCase();

  return skills.filter((skill) => {
    if (category !== 'all' && skill.category !== category) {
      return false;
    }

    if (parseStatus !== 'all' && skill.parseStatus !== parseStatus) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    return [skill.name, skill.description, skill.category, skill.slug]
      .join(' ')
      .toLowerCase()
      .includes(normalizedQuery);
  });
}

function uniqueValues(values: string[]) {
  return Array.from(new Set(values)).sort((left, right) => left.localeCompare(right));
}

function createOptions(values: string[], allLabel: string) {
  return [{ value: 'all', label: allLabel }, ...values.map((value) => ({ value, label: value }))];
}

export function SkillsBrowser({
  loadedAt,
  refreshQueryKeys,
  skills
}: {
  loadedAt: string;
  refreshQueryKeys: QueryKey[];
  skills: SkillSummary[];
}) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [parseStatus, setParseStatus] = useState('all');
  const deferredQuery = useDeferredValue(query);

  const filteredSkills = useMemo(
    () =>
      filterSkills({
        skills,
        query: deferredQuery,
        category,
        parseStatus
      }),
    [category, deferredQuery, parseStatus, skills]
  );
  const categoryOptions = createOptions(uniqueValues(skills.map((skill) => skill.category)), 'All categories');
  const parseStatusOptions = createOptions(uniqueValues(skills.map((skill) => skill.parseStatus)), 'All parse states');
  const hasActiveFilters = query.trim().length > 0 || category !== 'all' || parseStatus !== 'all';

  const summaryItems = [
    {
      label: 'skills',
      value: String(filteredSkills.length),
      detail: query ? `Filtered from ${skills.length} total skills.` : 'Total installed skills.',
      tone: 'default' as const
    },
    {
      label: 'categories',
      value: String(new Set(filteredSkills.map((skill) => skill.category)).size),
      detail: 'Skill categories in the current view.',
      tone: 'default' as const
    },
    {
      label: 'linked files',
      value: String(filteredSkills.reduce((sum, skill) => sum + skill.linkedFiles.length, 0)),
      detail: 'Referenced files across visible skills.',
      tone: 'default' as const
    },
    {
      label: 'incomplete',
      value: String(filteredSkills.filter((skill) => skill.parseStatus === 'malformed').length),
      detail: 'Skills with missing or incomplete metadata.',
      tone: 'muted' as const
    }
  ];

  return (
    <div className="space-y-8">
      <section>
        <div className="flex flex-wrap items-center gap-3">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-accent">Skills</p>
          <RefreshButton loadedAt={loadedAt} queryKeys={refreshQueryKeys} />
        </div>
        <h2 className="mt-3 font-[family-name:var(--font-bricolage)] text-xl font-semibold tracking-tight text-fg-strong sm:text-2xl">
          Installed Skills
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-fg-muted">
          Skills available to Hermes, with linked files and metadata.
        </p>
        <div className="mt-4 flex flex-wrap items-stretch gap-3">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Search skills, categories, and descriptions"
            className="min-w-[18rem] flex-[2.2_1_24rem]"
          />
          <AppSelect
            value={category}
            onChange={setCategory}
            options={categoryOptions}
            ariaLabel="Filter skills by category"
            className="min-w-[11.5rem] flex-[0_1_12rem]"
          />
          <AppSelect
            value={parseStatus}
            onChange={setParseStatus}
            options={parseStatusOptions}
            ariaLabel="Filter skills by parse status"
            className="min-w-[11.5rem] flex-[0_1_12rem]"
          />
          {hasActiveFilters ? (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setCategory('all');
                setParseStatus('all');
              }}
              className="rounded-xl border border-border/70 bg-bg/35 px-3 py-2.5 text-sm text-fg-muted transition-colors hover:border-accent/35 hover:text-fg"
            >
              Clear filters
            </button>
          ) : null}
        </div>
      </section>

      <SkillsSummaryGrid items={summaryItems} />
      {filteredSkills.length === 0 ? (
        <EmptyState
          eyebrow="No matches"
          title="No skills matched these filters"
          description="Try a different category, parse state, or search term."
          action={
            hasActiveFilters ? (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setCategory('all');
                  setParseStatus('all');
                }}
                className="rounded-md border border-border/80 bg-bg/40 px-3 py-1.5 text-xs text-fg-muted transition-colors hover:border-accent/40 hover:text-fg"
              >
                Reset filters
              </button>
            ) : null
          }
        />
      ) : (
        <SkillsIndex skills={filteredSkills} />
      )}
    </div>
  );
}
