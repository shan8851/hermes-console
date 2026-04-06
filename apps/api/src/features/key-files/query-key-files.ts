import { readHermesInstallationResult } from "@/features/inventory/read-installation";
import {
  isWorkspaceRootConfigured,
  resolveInventoryPathConfigFromEnv,
} from "@/features/inventory/resolve-path-config";
import { readKeyFileContent } from "@/features/key-files/read-key-file-content";
import { readKeyFilesResult } from "@/features/key-files/read-key-files";
import { readHermesMemoryResult } from "@/features/memory/read-memory";
import { createHermesQueryResult } from "@hermes-console/runtime";
import type { HermesQueryIssue, HermesQueryResult } from "@hermes-console/runtime";
import type { KeyFileContentData, KeyFilesData } from "@hermes-console/runtime";

export function readKeyFilesDataQuery(): HermesQueryResult<KeyFilesData> {
  const capturedAt = new Date().toISOString();
  const installation = readHermesInstallationResult();
  const paths = resolveInventoryPathConfigFromEnv();
  const keyFiles = readKeyFilesResult();
  const memory = readHermesMemoryResult();
  const issues: HermesQueryIssue[] = [
    ...installation.issues,
    ...keyFiles.issues,
    ...memory.issues,
  ];

  if (!installation.data.hermesRootExists) {
    issues.push({
      id: "files-hermes-root-missing",
      code: "missing_path",
      severity: "error",
      summary: "Hermes root not found",
      detail:
        "Hermes-root files cannot be discovered because the configured Hermes root does not exist.",
      path: installation.data.paths.hermesRoot.path,
    });
  }

  if (!isWorkspaceRootConfigured(paths)) {
    issues.push({
      id: "files-workspace-scan-disabled",
      code: "scan_disabled",
      severity: "info",
      summary: "Workspace file discovery is disabled by default",
      detail:
        "Set HERMES_CONSOLE_WORKSPACE_DIR to opt into workspace instruction-file discovery. Hermes-root files still render normally.",
      path: paths.workspaceRoot.path,
    });
  }

  if (keyFiles.data.files.length === 0 && installation.data.hermesRootExists) {
    issues.push({
      id: "files-none-discovered",
      code: "missing_path",
      severity: "warning",
      summary: "No high-signal files were discovered",
      detail:
        "Hermes Console did not find any of its known Hermes-root or workspace instruction files.",
    });
  }

  return createHermesQueryResult({
    data: {
      keyFiles: keyFiles.data,
      memory: memory.data,
    },
    capturedAt,
    status:
      !installation.data.hermesRootExists
        ? "missing"
        : keyFiles.data.files.length === 0
          ? "partial"
          : "ready",
    issues,
  });
}

export function readKeyFileContentQuery({
  fileId,
}: {
  fileId: string;
}): HermesQueryResult<KeyFileContentData> | null {
  const selectedFile = readKeyFileContent(fileId);

  if (!selectedFile) {
    return null;
  }

  const issues: HermesQueryIssue[] = [];

  if (selectedFile.content == null) {
    issues.push({
      id: `files-unreadable-${selectedFile.file.id}`,
      code: "unreadable_path",
      severity: "warning",
      summary: "File could not be read as text",
      detail:
        "The selected file exists but could not be read as UTF-8 text from the local filesystem.",
      path: selectedFile.file.path,
    });
  }

  return createHermesQueryResult({
    data: selectedFile,
    capturedAt: new Date().toISOString(),
    status: issues.length > 0 ? "partial" : "ready",
    issues,
  });
}
