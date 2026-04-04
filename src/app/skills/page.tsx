import { createSectionMetadata } from "@/lib/create-section-metadata";
import { PlaceholderPage } from "@/components/placeholders/placeholder-page";

export const metadata = createSectionMetadata(
  "Skills",
  "Installed skills and linked capability files.",
);

export default function SkillsPage() {
  return (
    <PlaceholderPage
      eyebrow="Skills"
      title="Understand the capability surface you already have"
      description="The skills route will help users browse installed skills, categories, descriptions, and linked files without rummaging through directories."
      bullets={[
        "Skill list grouped into meaningful categories.",
        "Search and filters once the reader layer exists.",
        "Detail views for SKILL.md content and linked references.",
      ]}
    />
  );
}
