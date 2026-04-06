import { createHermesQueryResult } from "@hermes-console/runtime";
import { readSkillDocumentDetail, readSkillLinkedFileContent } from "@/features/skills/read-skill-detail";
import type {
  SkillDocumentDetail,
  SkillLinkedFileContent,
} from "@hermes-console/runtime";
import type { HermesQueryIssue, HermesQueryResult } from "@hermes-console/runtime";

export function readSkillDocumentDetailQuery({
  skillId,
}: {
  skillId: string;
}): HermesQueryResult<SkillDocumentDetail> | null {
  const detail = readSkillDocumentDetail({
    skillId,
  });

  if (!detail) {
    return null;
  }

  const issues: HermesQueryIssue[] = [];

  if (!detail.rawContent) {
    issues.push({
      id: `skills-unreadable-${detail.summary.id}`,
      code: "unreadable_path",
      severity: "warning",
      summary: "Skill file could not be read as text",
      detail:
        "The selected skill exists, but its SKILL.md content could not be read as UTF-8 text from the local filesystem.",
      path: detail.summary.skillPath,
    });
  }

  return createHermesQueryResult({
    data: detail,
    capturedAt: new Date().toISOString(),
    status: issues.length > 0 ? "partial" : "ready",
    issues,
  });
}

export function readSkillLinkedFileContentQuery({
  fileId,
  skillId,
}: {
  fileId: string;
  skillId: string;
}): HermesQueryResult<SkillLinkedFileContent> | null {
  const linkedFile = readSkillLinkedFileContent({
    linkedFileId: fileId,
    skillId,
  });

  if (!linkedFile) {
    return null;
  }

  const issues: HermesQueryIssue[] = [];

  if (linkedFile.content == null) {
    issues.push({
      id: `skills-linked-file-unreadable-${skillId}-${fileId}`,
      code: "unreadable_path",
      severity: "warning",
      summary: "Linked skill file could not be read as text",
      detail:
        "The selected linked skill file exists, but its content could not be read as UTF-8 text from the local filesystem.",
      path: linkedFile.file.absolutePath,
    });
  }

  return createHermesQueryResult({
    data: linkedFile,
    capturedAt: new Date().toISOString(),
    status: issues.length > 0 ? "partial" : "ready",
    issues,
  });
}
