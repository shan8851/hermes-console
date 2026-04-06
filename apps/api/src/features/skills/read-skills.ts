import path from "node:path";

import { nodeSkillsFileSystem } from "@/features/skills/node-skills-file-system";
import { readSkillsIndex } from "@/features/skills/read-skills-index";
import { resolveInventoryPathConfigFromEnv } from "@/features/inventory/resolve-path-config";
import { createUnreadablePathIssue } from "@/lib/query-issue-factories";
import { createReadResult } from "@/lib/read-result";

export function readHermesSkillsResult() {
  const paths = resolveInventoryPathConfigFromEnv();
  const skillsRoot = path.join(paths.hermesRoot.path, "skills");

  try {
    return createReadResult({
      data: readSkillsIndex({
        skillsRoot,
        fileSystem: nodeSkillsFileSystem,
      }),
    });
  } catch (error) {
    return createReadResult({
      data: {
        skillsRoot,
        skills: [],
      },
      issues: [
        createUnreadablePathIssue({
          id: "skills-read-failed",
          summary: "Skills could not be read",
          detail:
            error instanceof Error
              ? error.message
              : "Hermes Console could not read the Hermes skills directory.",
          path: skillsRoot,
        }),
      ],
    });
  }
}

export function readHermesSkills() {
  return readHermesSkillsResult().data;
}
