import path from "node:path";

import { readHermesInstallationResult } from "@/features/inventory/read-installation";
import { readHermesSkillsResult } from "@/features/skills/read-skills";
import type { SkillsIndexResult } from "@hermes-console/runtime";
import { createHermesQueryResult } from "@hermes-console/runtime";
import type { HermesQueryIssue, HermesQueryResult } from "@hermes-console/runtime";

export function readHermesSkillsQuery(): HermesQueryResult<SkillsIndexResult> {
  const capturedAt = new Date().toISOString();
  const installation = readHermesInstallationResult();
  const skills = readHermesSkillsResult();
  const agentsWithSkills = installation.data.agents.filter((agent) => agent.presence.skills);
  const issues: HermesQueryIssue[] = [...installation.issues, ...skills.issues];

  if (!installation.data.hermesRootExists) {
    issues.push({
      id: "skills-hermes-root-missing",
      code: "missing_path",
      severity: "error",
      summary: "Hermes root not found",
      detail:
        "Installed skills cannot be discovered because the configured Hermes root does not exist.",
      path: installation.data.paths.hermesRoot.path,
    });
  }

  if (agentsWithSkills.length === 0) {
    issues.push({
      id: "skills-root-missing",
      code: "missing_path",
      severity: installation.data.hermesRootExists ? "warning" : "error",
      summary: "No skills directories found",
      detail:
        "Hermes Console did not find any skills directories under the detected agent roots.",
      lookedFor: installation.data.agents.map((agent) => path.join(agent.rootPath, "skills")),
    });
  }

  return createHermesQueryResult({
    data: skills.data,
    capturedAt,
    status:
      !installation.data.hermesRootExists || agentsWithSkills.length === 0
        ? "missing"
        : issues.length > 0 || installation.data.status === "partial"
          ? "partial"
          : "ready",
    issues,
  });
}
