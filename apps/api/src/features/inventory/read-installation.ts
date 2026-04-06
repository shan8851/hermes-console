import { discoverHermesInstallation } from "@/features/inventory/discover-installation";
import { nodeInventoryFileSystem } from "@/features/inventory/node-file-system";
import { resolveInventoryPathConfigFromEnv } from "@/features/inventory/resolve-path-config";
import { createUnreadablePathIssue } from "@/lib/query-issue-factories";
import { createReadResult } from "@/lib/read-result";
import type { InventoryInstallation } from "@hermes-console/runtime";

export function readHermesInstallationResult() {
  const paths = resolveInventoryPathConfigFromEnv();
  const profilesRootPath = `${paths.hermesRoot.path}/profiles`;
  const fallbackInstallation: InventoryInstallation = {
    paths,
    hermesRootExists: false,
    profilesRootPath,
    profilesRootExists: false,
    agents: [],
    availableAgentCount: 0,
    status: "missing",
  };

  try {
    return createReadResult({
      data: discoverHermesInstallation({
        paths,
        fileSystem: nodeInventoryFileSystem,
      }),
    });
  } catch (error) {
    return createReadResult({
      data: fallbackInstallation,
      issues: [
        createUnreadablePathIssue({
          id: "inventory-read-failed",
          summary: "Hermes installation could not be read",
          detail:
            error instanceof Error
              ? error.message
              : "Hermes Console could not inspect the local Hermes installation.",
          path: paths.hermesRoot.path,
        }),
      ],
    });
  }
}

export function readHermesInstallation() {
  return readHermesInstallationResult().data;
}
