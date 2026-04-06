import { nodeKeyFilesFileSystem } from "@/features/key-files/node-key-files-file-system";
import { discoverKeyFiles } from "@/features/key-files/discover-key-files";
import {
  isWorkspaceRootConfigured,
  resolveInventoryPathConfigFromEnv,
} from "@/features/inventory/resolve-path-config";
import { createUnreadablePathIssue } from "@/lib/query-issue-factories";
import { createReadResult } from "@/lib/read-result";

export function readKeyFilesResult() {
  const paths = resolveInventoryPathConfigFromEnv();
  const includeWorkspaceRoot = isWorkspaceRootConfigured(paths);

  try {
    return createReadResult({
      data: discoverKeyFiles({
        hermesRoot: paths.hermesRoot.path,
        workspaceRoot: paths.workspaceRoot.path,
        includeWorkspaceRoot,
        fileSystem: nodeKeyFilesFileSystem,
      }),
    });
  } catch (error) {
    return createReadResult({
      data: {
        roots: {
          hermesRoot: paths.hermesRoot.path,
          workspaceRoot: paths.workspaceRoot.path,
        },
        files: [],
      },
      issues: [
        createUnreadablePathIssue({
          id: "files-discovery-failed",
          summary: "Key file discovery failed",
          detail:
            error instanceof Error
              ? error.message
              : "Hermes Console could not scan key files from the configured roots.",
          path: includeWorkspaceRoot
            ? paths.workspaceRoot.path
            : paths.hermesRoot.path,
        }),
      ],
    });
  }
}

export function readKeyFiles() {
  return readKeyFilesResult().data;
}
