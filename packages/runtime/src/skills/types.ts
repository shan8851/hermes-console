import { z } from "zod";

export type SkillParseStatus = "valid" | "malformed";
export type SkillLinkedFileKind = "reference" | "template" | "script" | "asset";

export type SkillLinkedFileSummary = {
  id: string;
  kind: SkillLinkedFileKind;
  relativePath: string;
  absolutePath: string;
};

export type SkillSummary = {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  skillPath: string;
  parseStatus: SkillParseStatus;
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
  frontmatter: Record<string, string>;
  selectedLinkedFile: SkillLinkedFileSummary | null;
  selectedLinkedFileContent: string | null;
};

export type SkillDocumentDetail = {
  summary: SkillSummary;
  rawContent: string;
  body: string;
  frontmatter: Record<string, string>;
};

export type SkillLinkedFileContent = {
  file: SkillLinkedFileSummary;
  content: string | null;
};

export const skillParseStatusSchema = z.enum(["valid", "malformed"]);
export const skillLinkedFileKindSchema = z.enum([
  "reference",
  "template",
  "script",
  "asset",
]);

export const skillLinkedFileSummarySchema = z.object({
  id: z.string(),
  kind: skillLinkedFileKindSchema,
  relativePath: z.string(),
  absolutePath: z.string(),
});

export const skillSummarySchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  description: z.string(),
  category: z.string(),
  skillPath: z.string(),
  parseStatus: skillParseStatusSchema,
  linkedFiles: z.array(skillLinkedFileSummarySchema),
});

export const skillsIndexResultSchema = z.object({
  skillsRoot: z.string(),
  skills: z.array(skillSummarySchema),
});

export const skillDetailSchema = z.object({
  summary: skillSummarySchema,
  rawContent: z.string(),
  body: z.string(),
  frontmatter: z.record(z.string(), z.string()),
  selectedLinkedFile: skillLinkedFileSummarySchema.nullable(),
  selectedLinkedFileContent: z.string().nullable(),
});

export const skillDocumentDetailSchema = z.object({
  summary: skillSummarySchema,
  rawContent: z.string(),
  body: z.string(),
  frontmatter: z.record(z.string(), z.string()),
});

export const skillLinkedFileContentSchema = z.object({
  file: skillLinkedFileSummarySchema,
  content: z.string().nullable(),
});
