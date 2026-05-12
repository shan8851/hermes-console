import type { QueryKey } from '@tanstack/react-query';
import { useDeferredValue, useEffect, useMemo, useState } from 'react';

import { AppSelect } from '@/components/ui/app-select';
import { EmptyState } from '@/components/ui/empty-state';
import { RefreshButton } from '@/components/ui/refresh-button';
import { SearchInput } from '@/components/ui/search-input';
import { SkillsIndex } from '@/features/skills/components/skills-index';
import { SkillsSummaryGrid } from '@/features/skills/components/skills-summary-grid';
import { ALL_PROFILES_SCOPE, isAllProfilesScope, type ProfileScopeId } from '@/features/profile-scope/profile-scope';
import type { SkillSummary } from '@hermes-console/runtime';

export function filterSkills({
  category,
  profile,
  query,
  readiness,
  skills,
  source
}: {
  category: string;
  profile: string;
  query: string;
  readiness: string;
  skills: SkillSummary[];
  source: string;
}) {
  const normalizedQuery = query.trim().toLowerCase();

  return skills.filter((skill) => {
    if (profile !== 'all' && skill.profileId !== profile) {
      return false;
    }

    if (source !== 'all' && skill.source.kind !== source) {
      return false;
    }

    if (category !== 'all' && skill.category !== category) {
      return false;
    }

    if (readiness !== 'all' && skill.readiness.status !== readiness) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    return [skill.name, skill.description, skill.category, skill.slug, skill.source.label, ...skill.tags]
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
  profileScope,
  refreshQueryKeys,
  skills
}: {
  loadedAt: string;
  profileScope: ProfileScopeId;
  refreshQueryKeys: QueryKey[];
  skills: SkillSummary[];
}) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [readiness, setReadiness] = useState('all');
  const [source, setSource] = useState('all');
  const [profile, setProfile] = useState(isAllProfilesScope(profileScope) ? 'all' : profileScope);
  const deferredQuery = useDeferredValue(query);

  useEffect(() => {
    setProfile(isAllProfilesScope(profileScope) ? 'all' : profileScope);
  }, [profileScope]);

  const filteredSkills = useMemo(
    () =>
      filterSkills({
        category,
        profile,
        query: deferredQuery,
        readiness,
        skills,
        source
      }),
    [category, deferredQuery, profile, readiness, skills, source]
  );
  const categoryOptions = createOptions(uniqueValues(skills.map((skill) => skill.category)), 'All categories');
  const readinessOptions = createOptions(uniqueValues(skills.map((skill) => skill.readiness.status)), 'All readiness');
  const sourceOptions = createOptions(uniqueValues(skills.map((skill) => skill.source.kind)), 'All sources');
  const profileOptions = createOptions(
    uniqueValues(skills.map((skill) => skill.profileId).filter((value): value is string => value != null)),
    'All profiles'
  );
  const hasActiveFilters =
    query.trim().length > 0 || category !== 'all' || readiness !== 'all' || source !== 'all' || profile !== 'all';

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
      label: 'available',
      value: String(filteredSkills.filter((skill) => skill.readiness.status === 'available').length),
      detail: 'Visible skills without detected setup or platform blockers.',
      tone: 'default' as const
    },
    {
      label: 'setup needed',
      value: String(filteredSkills.filter((skill) => skill.readiness.status === 'setup_needed').length),
      detail: 'Visible skills with declared setup values missing.',
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
          Skills available to Hermes, with linked files, provenance, and readiness signals derived from local metadata.
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
            value={readiness}
            onChange={setReadiness}
            options={readinessOptions}
            ariaLabel="Filter skills by readiness"
            className="min-w-[11.5rem] flex-[0_1_12rem]"
          />
          <AppSelect
            value={source}
            onChange={setSource}
            options={sourceOptions}
            ariaLabel="Filter skills by source"
            className="min-w-[11.5rem] flex-[0_1_12rem]"
          />
          <AppSelect
            value={profile}
            onChange={setProfile}
            options={profileOptions}
            ariaLabel="Filter skills by profile"
            className="min-w-[11.5rem] flex-[0_1_12rem]"
          />
          {hasActiveFilters ? (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setCategory('all');
                setReadiness('all');
                setSource('all');
                setProfile(ALL_PROFILES_SCOPE);
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
          description="Try a different readiness, source, category, profile, or search term."
          action={
            hasActiveFilters ? (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setCategory('all');
                  setReadiness('all');
                  setSource('all');
                  setProfile(ALL_PROFILES_SCOPE);
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
