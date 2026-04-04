import { createSectionMetadata } from "@/lib/create-section-metadata";
import { PlaceholderPage } from "@/components/placeholders/placeholder-page";

export const metadata = createSectionMetadata(
  "Setup",
  "Inventory, roots, providers, and runtime posture.",
);

export default function SetupPage() {
  return (
    <PlaceholderPage
      eyebrow="Setup"
      title="Answer what kind of Hermes setup this actually is"
      description="The setup route will gather root paths, detected agents, providers, platforms, and runtime hints into one honest inventory surface."
      bullets={[
        "Detected roots and environment overrides.",
        "Providers, models, and platform posture where available.",
        "Graceful handling for missing or partial installs.",
      ]}
    />
  );
}
