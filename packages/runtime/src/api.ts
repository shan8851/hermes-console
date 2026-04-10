import { z } from 'zod';

import { inventoryPathKindSchema } from './inventory/types.js';
import { inventoryInstallationStatusSchema } from './inventory/discovery.js';
import {
  doctorSnapshotSummarySchema,
  gatewaySummarySchema,
  statusSnapshotSummarySchema,
  updateStatusSummarySchema
} from './runtime-overview/types.js';
import { hermesQueryIssueSchema, hermesQueryStatusSchema, type HermesQueryIssue } from './hermes-query.js';

export const dataStatusSchema = hermesQueryStatusSchema;
export const rootKindSchema = inventoryPathKindSchema;
export const gatewayStateSchema = gatewaySummarySchema.shape.state;
export const updateStatusSchema = updateStatusSummarySchema.shape.status;

export const snapshotMetaSchema = z.object({
  capturedAt: z.string().nullable(),
  dataStatus: dataStatusSchema
});

export const createSnapshotEnvelopeSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    data: dataSchema,
    issues: z.array(hermesQueryIssueSchema),
    meta: snapshotMetaSchema
  });

export const diagnosticsResponseSchema = z.object({
  data: z.object({
    status: statusSnapshotSummarySchema,
    doctor: doctorSnapshotSummarySchema
  }),
  issues: z.array(hermesQueryIssueSchema),
  meta: snapshotMetaSchema
});

export const appMetaSchema = z.object({
  rootPath: z.string(),
  rootKind: rootKindSchema,
  installStatus: inventoryInstallationStatusSchema,
  gatewayState: gatewayStateSchema,
  updateStatus: updateStatusSchema,
  updateBehind: z.number().nullable(),
  version: z.string().optional(),
  connectedPlatforms: z.array(z.string()),
  connectedPlatformCount: z.number()
});

export type AppMeta = z.infer<typeof appMetaSchema>;
export type DiagnosticsResponse = z.infer<typeof diagnosticsResponseSchema>;
export type SnapshotMeta = z.infer<typeof snapshotMetaSchema>;
export type SnapshotEnvelope<T> = {
  data: T;
  issues: HermesQueryIssue[];
  meta: SnapshotMeta;
};
