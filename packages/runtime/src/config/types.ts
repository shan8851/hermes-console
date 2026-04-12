import { z } from 'zod';

export type HermesConfigFileReadStatus = 'ready' | 'missing' | 'unreadable';

export type HermesConfigFile = {
  agentId: string;
  agentLabel: string;
  agentSource: 'root' | 'profile';
  path: string;
  content: string | null;
  readStatus: HermesConfigFileReadStatus;
  readDetail: string | null;
};

export type HermesConfigIndex = {
  files: HermesConfigFile[];
};

export const hermesConfigFileReadStatusSchema = z.enum(['ready', 'missing', 'unreadable']);

export const hermesConfigFileSchema = z
  .object({
    agentId: z.string(),
    agentLabel: z.string(),
    agentSource: z.enum(['root', 'profile']),
    path: z.string(),
    content: z.string().nullable(),
    readStatus: hermesConfigFileReadStatusSchema.optional(),
    readDetail: z.string().nullable().optional()
  })
  .transform<HermesConfigFile>((file) => ({
    ...file,
    readStatus: file.readStatus ?? (file.content == null ? 'missing' : 'ready'),
    readDetail: file.readDetail ?? null
  }));

export const hermesConfigIndexSchema = z.object({
  files: z.array(hermesConfigFileSchema)
});
