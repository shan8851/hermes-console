import path from "node:path";

import { readHermesInstallationResult } from "@/features/inventory/read-installation";
import { readHermesSessionsResult } from "@/features/sessions/read-hermes-sessions";
import { createHermesQueryResult } from "@hermes-console/runtime";
import type { HermesQueryIssue, HermesQueryResult } from "@hermes-console/runtime";
import type { HermesSessionsIndex } from "@hermes-console/runtime";

export function readHermesSessionsQuery(): HermesQueryResult<HermesSessionsIndex> {
  const capturedAt = new Date().toISOString();
  const installation = readHermesInstallationResult();
  const sessions = readHermesSessionsResult();
  const issues: HermesQueryIssue[] = [...installation.issues, ...sessions.issues];
  const agentsWithStateDb = installation.data.agents.filter((agent) => agent.presence.stateDb);

  if (!installation.data.hermesRootExists) {
    issues.push({
      id: "sessions-hermes-root-missing",
      code: "missing_path",
      severity: "error",
      summary: "Hermes root not found",
      detail:
        "Session history cannot be read because the configured Hermes root does not exist.",
      path: installation.data.paths.hermesRoot.path,
    });
  }

  if (agentsWithStateDb.length === 0) {
    issues.push({
      id: "sessions-state-db-missing",
      code: "missing_path",
      severity: installation.data.hermesRootExists ? "warning" : "error",
      summary: "No state.db files found",
      detail:
        "Hermes Console did not find any session databases under the detected agent roots.",
      lookedFor: installation.data.agents.map((agent) => path.join(agent.rootPath, "state.db")),
    });
  }

  return createHermesQueryResult({
    data: sessions.data,
    capturedAt,
    status:
      !installation.data.hermesRootExists || agentsWithStateDb.length === 0
        ? "missing"
        : issues.length > 0 || installation.data.status === "partial"
          ? "partial"
          : "ready",
    issues,
  });
}
