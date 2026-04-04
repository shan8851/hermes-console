import { createSectionMetadata } from "@/lib/create-section-metadata";
import { PlaceholderPage } from "@/components/placeholders/placeholder-page";

export const metadata = createSectionMetadata(
  "Memory",
  "USER and MEMORY surfaces with usage indicators.",
);

export default function MemoryPage() {
  return (
    <PlaceholderPage
      eyebrow="Memory"
      title="Make context shaping visible before it becomes mysterious"
      description="The memory route will show USER and MEMORY entries, usage against limits, and the high-signal warnings that matter for long-running Hermes setups."
      bullets={[
        "Separate USER and MEMORY panels with clear scope labels.",
        "Usage meters and near-limit warnings.",
        "Read-only detail view before any edit surface exists.",
      ]}
    />
  );
}
