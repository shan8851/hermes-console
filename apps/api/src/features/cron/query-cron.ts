import path from "node:path";

import { readHermesCronResult } from "@/features/cron/read-hermes-cron";
import type { HermesCronIndex } from "@hermes-console/runtime";
import { readHermesInstallationResult } from "@/features/inventory/read-installation";
import { createHermesQueryResult } from "@hermes-console/runtime";
import type { HermesQueryIssue, HermesQueryResult } from "@hermes-console/runtime";

export function readHermesCronQuery(): HermesQueryResult<HermesCronIndex> {
  const capturedAt = new Date().toISOString();
  const installation = readHermesInstallationResult();
  const cron = readHermesCronResult();
  const agentsWithCron = installation.data.agents.filter((agent) => agent.presence.cron);
  const issues: HermesQueryIssue[] = [...installation.issues, ...cron.issues];

  if (!installation.data.hermesRootExists) {
    issues.push({
      id: "cron-hermes-root-missing",
      code: "missing_path",
      severity: "error",
      summary: "Hermes root not found",
      detail:
        "Scheduled job data cannot be read because the configured Hermes root does not exist.",
      path: installation.data.paths.hermesRoot.path,
    });
  }

  if (agentsWithCron.length === 0) {
    issues.push({
      id: "cron-jobs-missing",
      code: "missing_path",
      severity: installation.data.hermesRootExists ? "warning" : "error",
      summary: "No cron surfaces found",
      detail:
        "Hermes Console did not find cron directories under the detected agent roots.",
      lookedFor: installation.data.agents.map((agent) => path.join(agent.rootPath, "cron")),
    });
  }

  return createHermesQueryResult({
    data: cron.data,
    capturedAt,
    status:
      !installation.data.hermesRootExists || agentsWithCron.length === 0
        ? "missing"
        : issues.length > 0 || installation.data.status === "partial"
          ? "partial"
          : "ready",
    issues,
  });
}
