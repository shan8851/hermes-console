import type {
  HermesQueryIssue,
  HermesQueryResult,
  HermesQueryStatus,
  SnapshotEnvelope,
  SnapshotMeta,
} from "@hermes-console/runtime";

export const createSnapshotMeta = ({
  capturedAt,
  dataStatus,
}: {
  capturedAt: string | null;
  dataStatus: HermesQueryStatus;
}): SnapshotMeta => ({
  capturedAt,
  dataStatus,
});

export const createLiveSnapshotEnvelope = <T>({
  result,
}: {
  result: HermesQueryResult<T>;
}): SnapshotEnvelope<T> => ({
  data: result.data,
  issues: result.issues,
  meta: createSnapshotMeta({
    capturedAt: result.capturedAt,
    dataStatus: result.status,
  }),
});

export const createLiveDataEnvelope = <T>({
  capturedAt = new Date().toISOString(),
  data,
  issues = [],
  status = "ready",
}: {
  capturedAt?: string | null;
  data: T;
  issues?: HermesQueryIssue[];
  status?: HermesQueryStatus;
}): SnapshotEnvelope<T> => ({
  data,
  issues,
  meta: createSnapshotMeta({
    capturedAt,
    dataStatus: status,
  }),
});
