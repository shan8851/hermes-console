import type { HermesQueryIssue } from "@hermes-console/runtime";

const createPathIssue = ({
  code,
  detail,
  id,
  path,
  severity = "warning",
  summary,
}: {
  code: HermesQueryIssue["code"];
  detail: string;
  id: string;
  path: string;
  severity?: HermesQueryIssue["severity"];
  summary: string;
}): HermesQueryIssue => ({
  id,
  code,
  severity,
  summary,
  detail,
  path,
});

export const createUnreadablePathIssue = ({
  detail,
  id,
  path,
  severity,
  summary,
}: Omit<Parameters<typeof createPathIssue>[0], "code">): HermesQueryIssue =>
  createPathIssue({
    id,
    code: "unreadable_path",
    summary,
    detail,
    path,
    severity: severity ?? "warning",
  });

export const createMissingPathIssue = ({
  detail,
  id,
  path,
  severity,
  summary,
}: Omit<Parameters<typeof createPathIssue>[0], "code">): HermesQueryIssue =>
  createPathIssue({
    id,
    code: "missing_path",
    summary,
    detail,
    path,
    severity: severity ?? "warning",
  });

export const createParseFailedIssue = ({
  detail,
  id,
  path,
  severity,
  summary,
}: Omit<Parameters<typeof createPathIssue>[0], "code">): HermesQueryIssue =>
  createPathIssue({
    id,
    code: "parse_failed",
    summary,
    detail,
    path,
    severity: severity ?? "warning",
  });

export const createMissingDependencyIssue = ({
  detail,
  id,
  path,
  severity,
  summary,
}: Omit<Parameters<typeof createPathIssue>[0], "code">): HermesQueryIssue =>
  createPathIssue({
    id,
    code: "missing_dependency",
    summary,
    detail,
    path,
    severity: severity ?? "warning",
  });
