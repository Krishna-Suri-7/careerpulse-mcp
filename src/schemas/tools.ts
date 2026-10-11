import { z } from 'zod';
import { LinkedInProfileSchema, PartialLinkedInProfileSchema } from './profile.js';

// Helper for inputs that can be passed either as a structured object or as a JSON string
export const ProfileInputSchema = z.union([
  LinkedInProfileSchema,
  z.string().transform((str, ctx) => {
    try {
      const parsed = JSON.parse(str);
      return LinkedInProfileSchema.parse(parsed);
    } catch (err: any) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Invalid profile JSON: ${err.message}`,
      });
      return z.NEVER;
    }
  }),
]);

export const UpdatedProfileInputSchema = z.union([
  PartialLinkedInProfileSchema,
  z.string().transform((str, ctx) => {
    try {
      const parsed = JSON.parse(str);
      return PartialLinkedInProfileSchema.parse(parsed);
    } catch (err: any) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Invalid updated profile JSON: ${err.message}`,
      });
      return z.NEVER;
    }
  }),
]);

// 1. parse_profile_pdf input schema
export const ParseProfilePdfInputSchema = z
  .object({
    filePath: z.string().optional().describe('Local file path to the LinkedIn profile PDF export'),
    base64: z.string().optional().describe('Base64-encoded content of the LinkedIn profile PDF export'),
  })
  .refine((data) => !!data.filePath || !!data.base64, {
    message: 'Either filePath or base64 must be provided',
  });

export type ParseProfilePdfInput = z.infer<typeof ParseProfilePdfInputSchema>;

// 2. audit_profile input schema
export const AuditProfileInputSchema = z.object({
  profile: ProfileInputSchema.describe('LinkedIn profile object or serialized JSON string'),
});

export type AuditProfileInput = z.infer<typeof AuditProfileInputSchema>;

// 3. keyword_gap_analysis input schema
export const KeywordGapAnalysisInputSchema = z
  .object({
    profile: ProfileInputSchema.describe('LinkedIn profile object or serialized JSON string'),
    targetJobDescription: z
      .string()
      .optional()
      .describe('Full text of the target job description to compare against'),
    targetRoleKeywords: z
      .array(z.string())
      .optional()
      .describe('List of target keywords or competencies for the target role'),
    targetRoleTitle: z
      .string()
      .optional()
      .describe('Optional target job title (e.g. "Senior Staff Software Engineer")'),
  })
  .refine((data) => !!data.targetJobDescription || (!!data.targetRoleKeywords && data.targetRoleKeywords.length > 0), {
    message: 'Either targetJobDescription or targetRoleKeywords must be provided',
  });

export type KeywordGapAnalysisInput = z.infer<typeof KeywordGapAnalysisInputSchema>;

// 4. rewrite_section input schema
export const RewriteSectionInputSchema = z.object({
  section: z.enum(['headline', 'about', 'experience']).describe('Profile section to rewrite'),
  currentContent: z
    .union([
      z.string(),
      z.object({
        title: z.string().optional(),
        company: z.string().optional(),
        bullets: z.array(z.string()).optional(),
        rawText: z.string().optional(),
      }),
    ])
    .describe('Current text or object describing the section to rewrite'),
  targetRole: z.string().optional().describe('Desired target job title or role focus'),
  focusKeywords: z.array(z.string()).optional().describe('Keywords to incorporate into the rewrite'),
  metrics: z
    .array(z.string())
    .optional()
    .describe('Specific quantifiable metrics or accomplishments to weave into XYZ format (e.g. "reduced latency by 35%", "$2M ARR")'),
  tone: z
    .enum(['impactful', 'executive', 'technical', 'concise'])
    .optional()
    .default('impactful')
    .describe('Stylistic tone for the rewrite'),
});

export type RewriteSectionInput = z.infer<typeof RewriteSectionInputSchema>;

// 5. export_profile_diff input schema
export const ExportProfileDiffInputSchema = z.object({
  currentProfile: ProfileInputSchema.describe('Current profile before changes'),
  updatedProfile: UpdatedProfileInputSchema.describe('Updated profile or partial updates to compare against current profile'),
  format: z.enum(['unified', 'side_by_side', 'summary_only']).optional().default('unified').describe('Diff formatting style'),
});

export type ExportProfileDiffInput = z.infer<typeof ExportProfileDiffInputSchema>;
