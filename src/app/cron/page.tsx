import { CronBrowser } from "@/features/cron/components/cron-browser";
import { readHermesCron } from "@/features/cron/read-hermes-cron";
import { createSectionMetadata } from "@/lib/create-section-metadata";

export const metadata = createSectionMetadata(
  "Cron",
  "Scheduled Hermes jobs and recent run state.",
);

export default function CronPage() {
  const index = readHermesCron();

  return <CronBrowser jobs={index.jobs} />;
}
