import { z } from 'zod';

export type HermesConfigFile = {
  agentId: string;
  agentLabel: string;
  agentSource: 'root' | 'profile';
  path: string;
  content: string | null;
};

export type HermesConfigIndex = {
  files: HermesConfigFile[];
};

export const hermesConfigFileSchema = z.object({
  agentId: z.string(),
  agentLabel: z.string(),
  agentSource: z.enum(['root', 'profile']),
  path: z.string(),
  content: z.string().nullable()
});

export const hermesConfigIndexSchema = z.object({
  files: z.array(hermesConfigFileSchema)
});
