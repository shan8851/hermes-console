import { createHermesQueryResult } from '@hermes-console/runtime';
import { readHermesSessionDetail } from '@/features/sessions/read-session-detail';
import type { HermesQueryResult, SessionDetail } from '@hermes-console/runtime';

export function readHermesSessionDetailQuery({
  agentId,
  sessionId
}: {
  agentId: string;
  sessionId: string;
}): HermesQueryResult<SessionDetail> | null {
  const detail = readHermesSessionDetail({
    agentId,
    sessionId
  });

  if (!detail) {
    return null;
  }

  return createHermesQueryResult({
    data: detail.data,
    capturedAt: new Date().toISOString(),
    status: detail.issues.some((issue) => issue.severity === 'error') || detail.issues.length > 0 ? 'partial' : 'ready',
    issues: detail.issues
  });
}
