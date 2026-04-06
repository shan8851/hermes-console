import path from "node:path";

import { readHermesInstallationResult } from "@/features/inventory/read-installation";
import { resolveInventoryPathConfigFromEnv } from "@/features/inventory/resolve-path-config";
import { readHermesMemoryResult } from "@/features/memory/read-memory";
import { createHermesQueryResult } from "@hermes-console/runtime";
import type { HermesQueryIssue, HermesQueryResult } from "@hermes-console/runtime";
import type { MemoryReadResult } from "@hermes-console/runtime";

export function readHermesMemoryQuery(): HermesQueryResult<MemoryReadResult> {
  const capturedAt = new Date().toISOString();
  const installation = readHermesInstallationResult();
  const paths = resolveInventoryPathConfigFromEnv();
  const memory = readHermesMemoryResult();
  const hermesRoot = paths.hermesRoot.path;
  const issues: HermesQueryIssue[] = [...installation.issues, ...memory.issues];

  if (!installation.data.hermesRootExists) {
    issues.push({
      id: "memory-hermes-root-missing",
      code: "missing_path",
      severity: "error",
      summary: "Hermes root not found",
      detail:
        "Memory files cannot be read because the configured Hermes root does not exist.",
      path: hermesRoot,
    });
  }

  if (!memory.data.files.memory.exists) {
    issues.push({
      id: "memory-file-missing",
      code: "missing_path",
      severity: memory.data.files.user.exists ? "warning" : "error",
      summary: "MEMORY.md not found",
      detail: "The shared Hermes memory file was not found under memories/MEMORY.md.",
      path: path.join(hermesRoot, "memories", "MEMORY.md"),
    });
  }

  if (!memory.data.files.user.exists) {
    issues.push({
      id: "user-file-missing",
      code: "missing_path",
      severity: memory.data.files.memory.exists ? "warning" : "error",
      summary: "USER.md not found",
      detail: "The shared Hermes user profile file was not found under memories/USER.md.",
      path: path.join(hermesRoot, "memories", "USER.md"),
    });
  }

  return createHermesQueryResult({
    data: memory.data,
    capturedAt,
    status:
      memory.data.status === "missing"
        ? "missing"
        : memory.data.status === "partial" || issues.length > 0
          ? "partial"
          : "ready",
    issues,
  });
}
