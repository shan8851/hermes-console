import type { HermesQueryIssue } from "@hermes-console/runtime";

export type ReadResult<T> = {
  data: T;
  issues: HermesQueryIssue[];
};

export const createReadResult = <T>({
  data,
  issues = [],
}: {
  data: T;
  issues?: HermesQueryIssue[];
}): ReadResult<T> => ({
  data,
  issues,
});
