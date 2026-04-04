import { createSectionMetadata } from "@/lib/create-section-metadata";
import { PlaceholderPage } from "@/components/placeholders/placeholder-page";

export const metadata = createSectionMetadata(
  "Sessions",
  "Recent Hermes activity and session history.",
);

export default function SessionsPage() {
  return (
    <PlaceholderPage
      eyebrow="Sessions"
      title="Recent Hermes activity, without transcript spelunking"
      description="This route will surface recent sessions across agents, show last-updated times, and provide a clean drill-in path into session detail."
      bullets={[
        "Recent session list with title, source, and recency.",
        "Agent filtering without pretending global data is agent-scoped.",
        "Detail view for tails, previews, and important metadata.",
      ]}
    />
  );
}
