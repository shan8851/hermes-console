import { notFound } from "next/navigation";

import { CronDetailView } from "@/features/cron/components/cron-detail-view";
import { readHermesCronDetail } from "@/features/cron/read-cron-detail";
import { createSectionMetadata } from "@/lib/create-section-metadata";

export const metadata = createSectionMetadata(
  "Cron detail",
  "Inspect a scheduled Hermes job and its recent outputs.",
);

export default async function CronDetailPage({
  params,
}: {
  params: Promise<{ agentId: string; jobId: string }>;
}) {
  const resolvedParams = await params;
  const detail = readHermesCronDetail({
    agentId: resolvedParams.agentId,
    jobId: resolvedParams.jobId,
  });

  if (!detail) {
    notFound();
  }

  return <CronDetailView detail={detail} />;
}
