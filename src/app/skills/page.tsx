import { SkillsBrowser } from "@/features/skills/components/skills-browser";
import { readHermesSkills } from "@/features/skills/read-skills";
import { createSectionMetadata } from "@/lib/create-section-metadata";

export const metadata = createSectionMetadata(
  "Skills",
  "Installed skills and linked capability files.",
);

export default function SkillsPage() {
  const index = readHermesSkills();

  return <SkillsBrowser skills={index.skills} loadedAt={new Date().toISOString()} />;
}
