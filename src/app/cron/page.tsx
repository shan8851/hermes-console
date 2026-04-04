import { createSectionMetadata } from "@/lib/create-section-metadata";
import { PlaceholderPage } from "@/components/placeholders/placeholder-page";

export const metadata = createSectionMetadata(
  "Cron",
  "Scheduled Hermes jobs and recent run state.",
);

export default function CronPage() {
  return (
    <PlaceholderPage
      eyebrow="Cron"
      title="Scheduled work should be obvious, not archaeology"
      description="The cron route will focus on schedules, state, run history, and simple warning signals for stale or failing jobs."
      bullets={[
        "Job list with enabled state, schedule, and next run.",
        "Recent run history with status and timing.",
        "Low-noise warning chips for stale or broken jobs.",
      ]}
    />
  );
}
