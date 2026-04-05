"use client";

import { useDeferredValue, useMemo, useState } from "react";

import { RefreshButton } from "@/components/ui/refresh-button";
import { SkillsIndex } from "@/features/skills/components/skills-index";
import { SkillsSummaryGrid } from "@/features/skills/components/skills-summary-grid";
import type { SkillSummary } from "@/features/skills/types";

function filterSkills(skills: SkillSummary[], query: string) {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return skills;
  }

  return skills.filter((skill) =>
    [skill.name, skill.description, skill.category, skill.slug]
      .join(" ")
      .toLowerCase()
      .includes(normalizedQuery),
  );
}

export function SkillsBrowser({ skills, loadedAt }: { skills: SkillSummary[]; loadedAt: string }) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);

  const filteredSkills = useMemo(() => filterSkills(skills, deferredQuery), [skills, deferredQuery]);

  const summaryItems = [
    {
      label: "skills",
      value: String(filteredSkills.length),
      detail: query ? `Filtered from ${skills.length} total skills.` : "Total installed skills.",
      tone: "default" as const,
    },
    {
      label: "categories",
      value: String(new Set(filteredSkills.map((skill) => skill.category)).size),
      detail: "Skill categories in the current view.",
      tone: "default" as const,
    },
    {
      label: "linked files",
      value: String(filteredSkills.reduce((sum, skill) => sum + skill.linkedFiles.length, 0)),
      detail: "Referenced files across visible skills.",
      tone: "default" as const,
    },
    {
      label: "incomplete",
      value: String(filteredSkills.filter((skill) => skill.parseStatus === "malformed").length),
      detail: "Skills with missing or incomplete metadata.",
      tone: "muted" as const,
    },
  ];

  return (
    <div className="space-y-8">
      <section className="max-w-3xl">
        <div className="flex flex-wrap items-center gap-3">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-accent">Skills</p>
          <RefreshButton loadedAt={loadedAt} />
        </div>
        <h2 className="mt-3 font-[family-name:var(--font-bricolage)] text-xl font-semibold tracking-tight text-fg-strong sm:text-2xl">
          Installed Skills
        </h2>
        <p className="mt-3 text-sm leading-7 text-fg-muted">
          Skills available to Hermes, with linked files and metadata.
        </p>
        <div className="mt-4 max-w-xl">
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search skills, categories, and descriptions"
            className="min-w-0 w-full rounded-md border border-border bg-surface/70 px-3 py-2 text-sm text-fg outline-none placeholder:text-fg-muted"
          />
        </div>
      </section>

      <SkillsSummaryGrid items={summaryItems} />
      <SkillsIndex skills={filteredSkills} />
    </div>
  );
}
