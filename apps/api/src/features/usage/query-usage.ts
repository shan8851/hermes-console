import path from "node:path";

import { readHermesInstallationResult } from "@/features/inventory/read-installation";
import { readHermesUsageResult } from "@/features/usage/read-usage";
import type { HermesUsageSummary } from "@hermes-console/runtime";
import { createHermesQueryResult } from "@hermes-console/runtime";
import type { HermesQueryIssue, HermesQueryResult } from "@hermes-console/runtime";

export function readHermesUsageQuery(): HermesQueryResult<HermesUsageSummary> {
  const now = new Date();
  const installation = readHermesInstallationResult();
  const usage = readHermesUsageResult(now);
  const issues: HermesQueryIssue[] = [...installation.issues, ...usage.issues];
  const agentsWithStateDb = installation.data.agents.filter((agent) => agent.presence.stateDb);

  if (!installation.data.hermesRootExists) {
    issues.push({
      id: "usage-hermes-root-missing",
      code: "missing_path",
      severity: "error",
      summary: "Hermes root not found",
      detail:
        "Usage could not be aggregated because the configured Hermes root does not exist.",
      path: installation.data.paths.hermesRoot.path,
    });
  }

  if (agentsWithStateDb.length === 0) {
    issues.push({
      id: "usage-state-db-missing",
      code: "missing_path",
      severity: installation.data.hermesRootExists ? "warning" : "error",
      summary: "No session databases found",
      detail:
        "Usage totals are read from Hermes session databases, but none were found under the detected agent roots.",
      lookedFor: installation.data.agents.map((agent) => path.join(agent.rootPath, "state.db")),
    });
  }

  return createHermesQueryResult({
    data: usage.data,
    capturedAt: usage.data.loadedAt,
    status:
      !installation.data.hermesRootExists || agentsWithStateDb.length === 0
        ? "missing"
        : issues.length > 0 || installation.data.status === "partial"
          ? "partial"
          : "ready",
    issues,
  });
}
