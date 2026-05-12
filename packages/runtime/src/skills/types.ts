import { z } from 'zod';

export type SkillParseStatus = 'valid' | 'malformed';
export type SkillLinkedFileKind = 'reference' | 'template' | 'script' | 'asset';
export type SkillReadinessStatus = 'available' | 'setup_needed' | 'unsupported' | 'parse_issue' | 'unknown';
export type SkillRequirementKind = 'env' | 'config' | 'command' | 'tool' | 'toolset';
export type SkillRequirementStatus = 'present' | 'missing' | 'unknown';
export type SkillPlatformCompatibilityStatus = 'compatible' | 'unsupported' | 'unknown';
export type SkillSourceKind = 'root' | 'profile' | 'external';

export type SkillLinkedFileSummary = {
  id: string;
  kind: SkillLinkedFileKind;
  relativePath: string;
  absolutePath: string;
};

export type SkillRequirementSummary = {
  kind: SkillRequirementKind;
  name: string;
  required: boolean;
  status: SkillRequirementStatus;
};

export type SkillPlatformCompatibility = {
  platforms: string[];
  currentPlatform: string;
  status: SkillPlatformCompatibilityStatus;
};

export type SkillSourceSummary = {
  kind: SkillSourceKind;
  label: string;
  rootPath: string;
  agentId: string | null;
};

export type SkillReadinessSummary = {
  status: SkillReadinessStatus;
  reasons: string[];
  platform: SkillPlatformCompatibility;
  requirements: SkillRequirementSummary[];
  linkedFileCount: number;
  linkedFilesByKind: Record<SkillLinkedFileKind, number>;
};

export type SkillSummary = {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  profileId: string | null;
  source: SkillSourceSummary;
  skillPath: string;
  parseStatus: SkillParseStatus;
  readiness: SkillReadinessSummary;
  linkedFiles: SkillLinkedFileSummary[];
};

export type SkillsIndexResult = {
  skillsRoot: string;
  skills: SkillSummary[];
};

export type SkillDetail = {
  summary: SkillSummary;
  rawContent: string;
  body: string;
  frontmatter: Record<string, unknown>;
  selectedLinkedFile: SkillLinkedFileSummary | null;
  selectedLinkedFileContent: string | null;
};

export type SkillDocumentDetail = {
  summary: SkillSummary;
  rawContent: string;
  body: string;
  frontmatter: Record<string, unknown>;
};

export type SkillLinkedFileContent = {
  file: SkillLinkedFileSummary;
  content: string | null;
};

export const skillParseStatusSchema = z.enum(['valid', 'malformed']);
export const skillLinkedFileKindSchema = z.enum(['reference', 'template', 'script', 'asset']);
export const skillReadinessStatusSchema = z.enum([
  'available',
  'setup_needed',
  'unsupported',
  'parse_issue',
  'unknown'
]);
export const skillRequirementKindSchema = z.enum(['env', 'config', 'command', 'tool', 'toolset']);
export const skillRequirementStatusSchema = z.enum(['present', 'missing', 'unknown']);
export const skillPlatformCompatibilityStatusSchema = z.enum(['compatible', 'unsupported', 'unknown']);
export const skillSourceKindSchema = z.enum(['root', 'profile', 'external']);

export const skillLinkedFileSummarySchema = z.object({
  id: z.string(),
  kind: skillLinkedFileKindSchema,
  relativePath: z.string(),
  absolutePath: z.string()
});

export const skillRequirementSummarySchema = z.object({
  kind: skillRequirementKindSchema,
  name: z.string(),
  required: z.boolean(),
  status: skillRequirementStatusSchema
});

export const skillPlatformCompatibilitySchema = z.object({
  platforms: z.array(z.string()),
  currentPlatform: z.string(),
  status: skillPlatformCompatibilityStatusSchema
});

export const skillSourceSummarySchema = z.object({
  kind: skillSourceKindSchema,
  label: z.string(),
  rootPath: z.string(),
  agentId: z.string().nullable()
});

export const skillReadinessSummarySchema = z.object({
  status: skillReadinessStatusSchema,
  reasons: z.array(z.string()),
  platform: skillPlatformCompatibilitySchema,
  requirements: z.array(skillRequirementSummarySchema),
  linkedFileCount: z.number(),
  linkedFilesByKind: z.record(skillLinkedFileKindSchema, z.number())
});

export const skillSummarySchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  description: z.string(),
  category: z.string(),
  tags: z.array(z.string()),
  profileId: z.string().nullable(),
  source: skillSourceSummarySchema,
  skillPath: z.string(),
  parseStatus: skillParseStatusSchema,
  readiness: skillReadinessSummarySchema,
  linkedFiles: z.array(skillLinkedFileSummarySchema)
});

export const skillsIndexResultSchema = z.object({
  skillsRoot: z.string(),
  skills: z.array(skillSummarySchema)
});

export const skillDetailSchema = z.object({
  summary: skillSummarySchema,
  rawContent: z.string(),
  body: z.string(),
  frontmatter: z.record(z.string(), z.unknown()),
  selectedLinkedFile: skillLinkedFileSummarySchema.nullable(),
  selectedLinkedFileContent: z.string().nullable()
});

export const skillDocumentDetailSchema = z.object({
  summary: skillSummarySchema,
  rawContent: z.string(),
  body: z.string(),
  frontmatter: z.record(z.string(), z.unknown())
});

export const skillLinkedFileContentSchema = z.object({
  file: skillLinkedFileSummarySchema,
  content: z.string().nullable()
});
