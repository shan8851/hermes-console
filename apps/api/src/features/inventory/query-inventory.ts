import type { InventoryInstallation } from "@/features/inventory/discover-installation";
import { readHermesInstallationResult } from "@/features/inventory/read-installation";
import { createHermesQueryResult } from "@hermes-console/runtime";
import type { HermesQueryIssue, HermesQueryResult } from "@hermes-console/runtime";

export const readHermesInventoryQuery = (): HermesQueryResult<InventoryInstallation> => {
  const capturedAt = new Date().toISOString();
  const installation = readHermesInstallationResult();
  const issues: HermesQueryIssue[] = [...installation.issues];

  if (!installation.data.hermesRootExists) {
    issues.push({
      id: "inventory-hermes-root-missing",
      code: "missing_path",
      severity: "error",
      summary: "Hermes root not found",
      detail:
        "Hermes Console could not find the configured Hermes root while reading installation data.",
      path: installation.data.paths.hermesRoot.path,
    });
  }

  return createHermesQueryResult({
    data: installation.data,
    capturedAt,
    issues,
    status: installation.data.status,
  });
};
