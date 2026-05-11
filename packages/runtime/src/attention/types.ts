import { z } from 'zod';

export const attentionSeveritySchema = z.enum(['critical', 'warning', 'info']);

export const attentionDomainSchema = z.enum([
  'cron',
  'gateway',
  'logs',
  'config',
  'skills',
  'memory',
  'sessions',
  'files',
  'runtime'
]);

export type AttentionSeverity = z.infer<typeof attentionSeveritySchema>;
export type AttentionDomain = z.infer<typeof attentionDomainSchema>;

export type AttentionItem = {
  id: string;
  severity: AttentionSeverity;
  domain: AttentionDomain;
  title: string;
  summary: string;
  evidence?: string | undefined;
  href?: string | undefined;
  profileId?: string | undefined;
  profileLabel?: string | undefined;
  isActionable: boolean;
  isOptionalSurface: boolean;
};

export const attentionItemSchema = z.object({
  id: z.string(),
  severity: attentionSeveritySchema,
  domain: attentionDomainSchema,
  title: z.string(),
  summary: z.string(),
  evidence: z.string().optional(),
  href: z.string().optional(),
  profileId: z.string().optional(),
  profileLabel: z.string().optional(),
  isActionable: z.boolean(),
  isOptionalSurface: z.boolean()
});
