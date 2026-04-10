import { queryOptions } from '@tanstack/react-query';
import {
  appMetaSchema,
  createSnapshotEnvelopeSchema,
  diagnosticsResponseSchema,
  hermesMemoryIndexSchema,
  hermesCronIndexSchema,
  hermesCronJobDetailSchema,
  hermesSessionsIndexSchema,
  hermesUsageSummarySchema,
  inventoryInstallationSchema,
  keyFileContentDataSchema,
  keyFilesDataSchema,
  memoryReadResultSchema,
  runtimeOverviewSummarySchema,
  skillDocumentDetailSchema,
  skillLinkedFileContentSchema,
  skillsIndexResultSchema,
  usageWindowIdSchema,
  usageWindowSummarySchema,
  type AppMeta,
  type DiagnosticsResponse,
  type HermesMemoryIndex,
  type HermesUsageSummary,
  type KeyFileContentData,
  type KeyFilesData,
  type SnapshotEnvelope
} from '@hermes-console/runtime';
import { z } from 'zod';

const readErrorMessage = async (response: Response): Promise<string> => {
  try {
    const payload = (await response.json()) as { error?: string };
    return payload.error ?? response.statusText;
  } catch {
    return response.statusText;
  }
};

const fetchJson = async <T>({
  init,
  path,
  schema
}: {
  init?: RequestInit;
  path: string;
  schema: z.ZodType<T>;
}): Promise<T> => {
  const response = await fetch(path, {
    headers: {
      Accept: 'application/json'
    },
    ...init
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  return schema.parse(await response.json());
};

const fetchSnapshot = async <T>({
  dataSchema,
  path
}: {
  dataSchema: z.ZodType<T>;
  path: string;
}): Promise<SnapshotEnvelope<T>> =>
  fetchJson({
    path,
    schema: createSnapshotEnvelopeSchema(dataSchema)
  });

const legacyMemorySnapshotDataSchema = memoryReadResultSchema.transform<HermesMemoryIndex>((memory) => ({
  agents: [
    {
      ...memory,
      agentId: 'default',
      agentLabel: 'Default',
      agentSource: 'root'
    }
  ],
  agentCount: 1,
  agentsWithMemory: memory.status === 'missing' ? 0 : 1
}));

const memorySnapshotDataSchema = z.union([hermesMemoryIndexSchema, legacyMemorySnapshotDataSchema]);

const legacyUsageSummarySchema = z
  .object({
    loadedAt: z.string(),
    windows: z.array(usageWindowSummarySchema),
    availableWindows: z.array(usageWindowIdSchema)
  })
  .transform<HermesUsageSummary>((usage) => ({
    ...usage,
    agents: [],
    records: []
  }));

const usageSnapshotDataSchema = z.union([hermesUsageSummarySchema, legacyUsageSummarySchema]);

export const apiQueryKeys = {
  appMeta: ['app-meta'] as const,
  cron: ['cron'] as const,
  cronDetail: (agentId: string, jobId: string) => ['cron-detail', agentId, jobId] as const,
  diagnostics: ['diagnostics'] as const,
  files: ['files'] as const,
  inventory: ['inventory'] as const,
  memory: ['memory'] as const,
  overview: ['overview'] as const,
  sessions: ['sessions'] as const,
  fileContent: (fileId: string) => ['file-content', fileId] as const,
  skillDetail: (skillId: string) => ['skill-detail', skillId] as const,
  skillLinkedFileContent: (skillId: string, fileId: string) => ['skill-linked-file-content', skillId, fileId] as const,
  skills: ['skills'] as const,
  usage: ['usage'] as const
};

export const appMetaQueryOptions = () =>
  queryOptions({
    queryKey: apiQueryKeys.appMeta,
    queryFn: () =>
      fetchJson<AppMeta>({
        path: '/api/meta/app',
        schema: appMetaSchema
      })
  });

export const overviewQueryOptions = () =>
  queryOptions({
    queryKey: apiQueryKeys.overview,
    queryFn: () =>
      fetchSnapshot({
        dataSchema: runtimeOverviewSummarySchema,
        path: '/api/runtime/overview'
      })
  });

export const diagnosticsQueryOptions = () =>
  queryOptions({
    queryKey: apiQueryKeys.diagnostics,
    queryFn: () =>
      fetchJson<DiagnosticsResponse>({
        path: '/api/runtime/diagnostics',
        schema: diagnosticsResponseSchema
      })
  });

export const inventoryQueryOptions = () =>
  queryOptions({
    queryKey: apiQueryKeys.inventory,
    queryFn: () =>
      fetchSnapshot({
        dataSchema: inventoryInstallationSchema,
        path: '/api/inventory'
      })
  });

export const memoryQueryOptions = () =>
  queryOptions({
    queryKey: apiQueryKeys.memory,
    queryFn: () =>
      fetchSnapshot({
        dataSchema: memorySnapshotDataSchema,
        path: '/api/memory'
      })
  });

export const sessionsQueryOptions = () =>
  queryOptions({
    queryKey: apiQueryKeys.sessions,
    queryFn: () =>
      fetchSnapshot({
        dataSchema: hermesSessionsIndexSchema,
        path: '/api/sessions'
      })
  });

export const cronQueryOptions = () =>
  queryOptions({
    queryKey: apiQueryKeys.cron,
    queryFn: () =>
      fetchSnapshot({
        dataSchema: hermesCronIndexSchema,
        path: '/api/cron'
      })
  });

export const cronDetailQueryOptions = ({ agentId, jobId }: { agentId: string; jobId: string }) =>
  queryOptions({
    queryKey: apiQueryKeys.cronDetail(agentId, jobId),
    queryFn: () =>
      fetchSnapshot({
        dataSchema: hermesCronJobDetailSchema,
        path: `/api/cron/${encodeURIComponent(agentId)}/${encodeURIComponent(jobId)}`
      })
  });

export const usageQueryOptions = () =>
  queryOptions({
    queryKey: apiQueryKeys.usage,
    queryFn: () =>
      fetchSnapshot({
        dataSchema: usageSnapshotDataSchema,
        path: '/api/usage'
      })
  });

export const skillsQueryOptions = () =>
  queryOptions({
    queryKey: apiQueryKeys.skills,
    queryFn: () =>
      fetchSnapshot({
        dataSchema: skillsIndexResultSchema,
        path: '/api/skills'
      })
  });

export const skillDetailQueryOptions = ({ skillId }: { skillId: string }) =>
  queryOptions({
    queryKey: apiQueryKeys.skillDetail(skillId),
    queryFn: () =>
      fetchSnapshot({
        dataSchema: skillDocumentDetailSchema,
        path: `/api/skills/${encodeURIComponent(skillId)}`
      })
  });

export const skillLinkedFileContentQueryOptions = ({ fileId, skillId }: { fileId: string; skillId: string }) =>
  queryOptions({
    queryKey: apiQueryKeys.skillLinkedFileContent(skillId, fileId),
    queryFn: () =>
      fetchSnapshot({
        dataSchema: skillLinkedFileContentSchema,
        path: `/api/skills/${encodeURIComponent(skillId)}/files/${encodeURIComponent(fileId)}`
      })
  });

export const filesQueryOptions = () =>
  queryOptions({
    queryKey: apiQueryKeys.files,
    queryFn: () =>
      fetchSnapshot({
        dataSchema: keyFilesDataSchema,
        path: '/api/files'
      })
  });

export const fileContentQueryOptions = ({ fileId }: { fileId: string }) =>
  queryOptions({
    queryKey: apiQueryKeys.fileContent(fileId),
    queryFn: () =>
      fetchSnapshot({
        dataSchema: keyFileContentDataSchema,
        path: `/api/files/${encodeURIComponent(fileId)}`
      })
  });

export type { KeyFileContentData, KeyFilesData, SnapshotEnvelope };
