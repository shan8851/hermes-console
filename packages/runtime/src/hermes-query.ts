import { z } from "zod";

export const hermesQueryIssueSeveritySchema = z.enum([
  "info",
  "warning",
  "error",
]);

export const hermesQueryIssueCodeSchema = z.enum([
  "missing_path",
  "unreadable_path",
  "parse_failed",
  "command_failed",
  "missing_dependency",
  "scan_disabled",
]);

export const hermesQueryIssueSchema = z.object({
  id: z.string(),
  code: hermesQueryIssueCodeSchema,
  severity: hermesQueryIssueSeveritySchema,
  summary: z.string(),
  detail: z.string(),
  path: z.string().optional(),
  lookedFor: z.array(z.string()).optional(),
});

export const hermesQueryStatusSchema = z.enum([
  "ready",
  "partial",
  "missing",
]);

export type HermesQueryIssueSeverity = z.infer<
  typeof hermesQueryIssueSeveritySchema
>;
export type HermesQueryIssueCode = z.infer<typeof hermesQueryIssueCodeSchema>;
export type HermesQueryIssue = z.infer<typeof hermesQueryIssueSchema>;
export type HermesQueryStatus = z.infer<typeof hermesQueryStatusSchema>;

export type HermesQueryResult<T> = {
  data: T;
  capturedAt: string;
  status: HermesQueryStatus;
  issues: HermesQueryIssue[];
};

export function createHermesQueryResult<T>({
  data,
  capturedAt,
  status,
  issues,
}: HermesQueryResult<T>): HermesQueryResult<T> {
  return {
    data,
    capturedAt,
    status,
    issues,
  };
}

export function hasActionableHermesIssues(issues: HermesQueryIssue[]) {
  return issues.some(
    (issue) => issue.severity === "warning" || issue.severity === "error",
  );
}
