import { createSectionMetadata } from "@/lib/create-section-metadata";
import { PlaceholderPage } from "@/components/placeholders/placeholder-page";

export const metadata = createSectionMetadata(
  "Files",
  "High-signal context and configuration files.",
);

export default function FilesPage() {
  return (
    <PlaceholderPage
      eyebrow="Files"
      title="Show the files that shape Hermes, not the whole filesystem"
      description="The files route will stay deliberately focused on high-signal text surfaces like memory files, SOUL.md, AGENTS.md, and other context-shaping config."
      bullets={[
        "Focused explorer for memory, config, and context files.",
        "Read-only previews with metadata and path context.",
        "No generic file manager nonsense in v1.",
      ]}
    />
  );
}
