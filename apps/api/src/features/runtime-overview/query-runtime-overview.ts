import path from "node:path";

import { readHermesCronResult } from "@/features/cron/read-hermes-cron";
import { readHermesInstallationResult } from "@/features/inventory/read-installation";
import { resolveInventoryPathConfigFromEnv } from "@/features/inventory/resolve-path-config";
import {
  createMissingPathIssue,
  createUnreadablePathIssue,
} from "@/lib/query-issue-factories";
import { readTextFileResult } from "@/lib/read-text-file-result";
import { readHermesMemoryResult } from "@/features/memory/read-memory";
import { readHermesSessionsResult } from "@/features/sessions/read-hermes-sessions";
import { createHermesQueryResult } from "@hermes-console/runtime";
import type { HermesQueryIssue, HermesQueryResult } from "@hermes-console/runtime";
import { composeRuntimeOverview } from "@hermes-console/runtime";
import {
  parseChannelDirectory,
  parseConfigPosture,
  parseEnvAssignments,
  parseGatewayState,
  parseUpdateStatus,
} from "@hermes-console/runtime";
import type { RuntimeOverviewSummary } from "@hermes-console/runtime";

function createMissingFileIssue({
  id,
  severity,
  summary,
  detail,
  targetPath,
}: {
  id: string;
  severity?: HermesQueryIssue["severity"];
  summary: string;
  detail: string;
  targetPath: string;
}): HermesQueryIssue {
  return createMissingPathIssue({
    id,
    ...(severity == null ? {} : { severity }),
    summary,
    detail,
    path: targetPath,
  });
}

function createUnreadableFileIssue({
  detail,
  id,
  summary,
  targetPath,
}: {
  detail: string;
  id: string;
  summary: string;
  targetPath: string;
}): HermesQueryIssue {
  return createUnreadablePathIssue({
    id,
    summary,
    detail,
    path: targetPath,
  });
}

export function readRuntimeOverviewQuery(): HermesQueryResult<RuntimeOverviewSummary> {
  const capturedAt = new Date().toISOString();
  const paths = resolveInventoryPathConfigFromEnv();
  const hermesRoot = paths.hermesRoot.path;

  const installation = readHermesInstallationResult();
  const memory = readHermesMemoryResult();
  const sessions = readHermesSessionsResult();
  const cron = readHermesCronResult();

  const gatewayPath = path.join(hermesRoot, "gateway_state.json");
  const channelDirectoryPath = path.join(hermesRoot, "channel_directory.json");
  const updatePath = path.join(hermesRoot, ".update_check");
  const configPath = path.join(hermesRoot, "config.yaml");
  const envPath = path.join(hermesRoot, ".env");

  const gatewayContent = readTextFileResult(gatewayPath);
  const channelDirectoryContent = readTextFileResult(channelDirectoryPath);
  const updateContent = readTextFileResult(updatePath);
  const configContent = readTextFileResult(configPath);
  const envContent = readTextFileResult(envPath);

  const gateway = parseGatewayState(gatewayContent.content ?? "");
  const channels = parseChannelDirectory(channelDirectoryContent.content ?? "");
  const update = parseUpdateStatus(updateContent.content ?? "");
  const config = parseConfigPosture(configContent.content ?? "");
  const envEntries = parseEnvAssignments(envContent.content ?? "");

  const issues: HermesQueryIssue[] = [
    ...installation.issues,
    ...memory.issues,
    ...sessions.issues,
    ...cron.issues,
  ];

  if (!installation.data.hermesRootExists) {
    issues.push({
      id: "runtime-hermes-root-missing",
      code: "missing_path",
      severity: "error",
      summary: "Hermes root not found",
      detail:
        "Hermes Console could not find the configured Hermes state root. Set HERMES_CONSOLE_HERMES_DIR or install Hermes in the default location.",
      path: hermesRoot,
    });
  }

  if (configContent.status === "missing") {
    issues.push(
      createMissingFileIssue({
        id: "runtime-config-missing",
        summary: "config.yaml not found",
        detail:
          "Runtime defaults are partially unknown because the Hermes config file was not found.",
        targetPath: configPath,
      }),
    );
  }
  if (configContent.status === "unreadable") {
    issues.push(
      createUnreadableFileIssue({
        id: "runtime-config-unreadable",
        summary: "config.yaml could not be read",
        detail: configContent.detail,
        targetPath: configPath,
      }),
    );
  }

  if (gatewayContent.status === "missing") {
    issues.push(
      createMissingFileIssue({
        id: "runtime-gateway-state-missing",
        summary: "gateway_state.json not found",
        detail:
          "Gateway state is currently inferred as unknown because the runtime snapshot file is missing.",
        targetPath: gatewayPath,
      }),
    );
  }
  if (gatewayContent.status === "unreadable") {
    issues.push(
      createUnreadableFileIssue({
        id: "runtime-gateway-state-unreadable",
        summary: "gateway_state.json could not be read",
        detail: gatewayContent.detail,
        targetPath: gatewayPath,
      }),
    );
  }

  if (channelDirectoryContent.status === "unreadable") {
    issues.push(
      createUnreadableFileIssue({
        id: "runtime-channel-directory-unreadable",
        summary: "channel_directory.json could not be read",
        detail: channelDirectoryContent.detail,
        targetPath: channelDirectoryPath,
      }),
    );
  }
  if (channelDirectoryContent.status === "missing") {
    issues.push(
      createMissingFileIssue({
        id: "runtime-channel-directory-missing",
        severity: "info",
        summary: "channel_directory.json not found",
        detail:
          "Connected surface counts may be incomplete because the channel directory snapshot file was not found.",
        targetPath: channelDirectoryPath,
      }),
    );
  }

  if (updateContent.status === "missing") {
    issues.push({
      id: "runtime-update-cache-missing",
      code: "missing_path",
      severity: "info",
      summary: "Update cache not found",
      detail:
        "Update drift will remain unknown until Hermes writes its .update_check cache.",
      path: updatePath,
    });
  }
  if (updateContent.status === "unreadable") {
    issues.push(
      createUnreadableFileIssue({
        id: "runtime-update-cache-unreadable",
        summary: ".update_check could not be read",
        detail: updateContent.detail,
        targetPath: updatePath,
      }),
    );
  }

  if (envContent.status === "unreadable") {
    issues.push(
      createUnreadableFileIssue({
        id: "runtime-env-unreadable",
        summary: ".env could not be read",
        detail: envContent.detail,
        targetPath: envPath,
      }),
    );
  }

  const overview = composeRuntimeOverview({
    installation: installation.data,
    gateway,
    channels,
    update,
    config,
    memory: memory.data,
    sessions: sessions.data,
    cron: cron.data,
    envEntries,
  });

  const status =
    installation.data.status === "missing"
      ? "missing"
      : issues.some(
            (issue) =>
              issue.severity === "warning" || issue.severity === "error",
          ) || installation.data.status === "partial"
        ? "partial"
        : "ready";

  return createHermesQueryResult({
    data: overview,
    capturedAt,
    status,
    issues,
  });
}
