import path from "node:path";

import { readHermesInstallationResult } from "@/features/inventory/read-installation";
import { resolveInventoryPathConfigFromEnv } from "@/features/inventory/resolve-path-config";
import { createUnreadablePathIssue } from "@/lib/query-issue-factories";
import { readTextFileResult } from "@/lib/read-text-file-result";
import { createHermesQueryResult } from "@hermes-console/runtime";
import type { HermesQueryIssue, HermesQueryResult } from "@hermes-console/runtime";
import {
  parseChannelDirectory,
  parseGatewayState,
  parseUpdateStatus,
} from "@hermes-console/runtime";
import type { ShellStatusSummary } from "@hermes-console/runtime";

const createUnreadableRuntimeIssue = ({
  detail,
  id,
  summary,
  targetPath,
}: {
  detail: string;
  id: string;
  summary: string;
  targetPath: string;
}): HermesQueryIssue =>
  createUnreadablePathIssue({
    id,
    summary,
    detail,
    path: targetPath,
  });

export function readShellStatusQuery(): HermesQueryResult<ShellStatusSummary> {
  const capturedAt = new Date().toISOString();
  const paths = resolveInventoryPathConfigFromEnv();
  const hermesRoot = paths.hermesRoot.path;
  const installation = readHermesInstallationResult();
  const gatewayPath = path.join(hermesRoot, "gateway_state.json");
  const channelDirectoryPath = path.join(hermesRoot, "channel_directory.json");
  const updatePath = path.join(hermesRoot, ".update_check");
  const gatewayContent = readTextFileResult(gatewayPath);
  const channelDirectoryContent = readTextFileResult(channelDirectoryPath);
  const updateContent = readTextFileResult(updatePath);

  const gateway = parseGatewayState(
    gatewayContent.content ?? "",
  );
  const channels = parseChannelDirectory(
    channelDirectoryContent.content ?? "",
  );
  const update = parseUpdateStatus(
    updateContent.content ?? "",
  );
  const issues: HermesQueryIssue[] = [...installation.issues];

  if (!installation.data.hermesRootExists) {
    issues.push({
      id: "shell-hermes-root-missing",
      code: "missing_path",
      severity: "error",
      summary: "Hermes root not found",
      detail:
        "The configured Hermes root could not be found. Topbar status reflects a degraded local runtime.",
      path: hermesRoot,
    });
  }

  if (gatewayContent.status === "unreadable") {
    issues.push(
      createUnreadableRuntimeIssue({
        id: "shell-gateway-state-unreadable",
        summary: "gateway_state.json could not be read",
        detail: gatewayContent.detail,
        targetPath: gatewayPath,
      }),
    );
  }

  if (channelDirectoryContent.status === "unreadable") {
    issues.push(
      createUnreadableRuntimeIssue({
        id: "shell-channel-directory-unreadable",
        summary: "channel_directory.json could not be read",
        detail: channelDirectoryContent.detail,
        targetPath: channelDirectoryPath,
      }),
    );
  }

  if (updateContent.status === "unreadable") {
    issues.push(
      createUnreadableRuntimeIssue({
        id: "shell-update-cache-unreadable",
        summary: ".update_check could not be read",
        detail: updateContent.detail,
        targetPath: updatePath,
      }),
    );
  }

  return createHermesQueryResult({
    data: {
      capturedAt,
      rootPath: hermesRoot,
      rootKind: paths.hermesRoot.kind,
      installStatus: installation.data.status,
      gatewayState: gateway.state,
      updateStatus: update.status,
      updateBehind: update.behind,
      connectedPlatformCount: new Set([
        ...gateway.connectedPlatforms,
        ...channels.connectedPlatforms,
      ]).size,
    },
    capturedAt,
    status:
      installation.data.status === "missing"
        ? "missing"
        : issues.length > 0 || installation.data.status === "partial"
          ? "partial"
          : "ready",
    issues,
  });
}
