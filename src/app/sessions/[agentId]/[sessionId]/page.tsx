import { notFound } from "next/navigation";

import { SessionDetailView } from "@/features/sessions/components/session-detail-view";
import { readHermesSessionDetail } from "@/features/sessions/read-session-detail";
import { createSectionMetadata } from "@/lib/create-section-metadata";

export const metadata = createSectionMetadata(
  "Session detail",
  "Inspect a single Hermes session and its stored transcript preview.",
);

export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ agentId: string; sessionId: string }>;
}) {
  const resolvedParams = await params;
  const detail = readHermesSessionDetail({
    agentId: resolvedParams.agentId,
    sessionId: resolvedParams.sessionId,
  });

  if (!detail) {
    notFound();
  }

  return <SessionDetailView detail={detail} />;
}
