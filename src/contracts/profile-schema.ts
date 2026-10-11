import { z } from 'zod';

// ==========================================
// 1. Candidate Profile Contract Schemas
// ==========================================

export const ContactInfoSchema = z.object({
  fullName: z.string().optional().default(''),
  email: z.string().email().or(z.string()).optional(),
  phone: z.string().optional(),
  location: z.string().optional(),
  linkedinUrl: z.string().url().or(z.string()).optional(),
  portfolioUrl: z.string().url().or(z.string()).optional(),
  websites: z.array(z.string()).optional().default([]),
});

export type ContactInfo = z.infer<typeof ContactInfoSchema>;
export const NormalizedContactInfoSchema = ContactInfoSchema;
export type NormalizedContactInfo = ContactInfo;

export const WorkExperienceSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, 'Job title is required'),
  company: z.string().min(1, 'Company name is required'),
  location: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  isCurrent: z.boolean().optional().default(false),
  description: z.string().optional().default(''),
  bulletPoints: z.array(z.string()).optional().default([]),
});

export type WorkExperience = z.infer<typeof WorkExperienceSchema>;
export const NormalizedExperienceSchema = WorkExperienceSchema;
export type NormalizedExperience = WorkExperience;

export const EducationSchema = z.object({
  id: z.string().optional(),
  school: z.string().min(1, 'School/Institution is required'),
  degree: z.string().optional(),
  fieldOfStudy: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  grade: z.string().optional(),
  activities: z.string().optional(),
});

export type Education = z.infer<typeof EducationSchema>;
export const NormalizedEducationSchema = EducationSchema;
export type NormalizedEducation = Education;

export const CertificationSchema = z.object({
  name: z.string().min(1, 'Certification name is required'),
  issuer: z.string().optional(),
  issueDate: z.string().optional(),
  expirationDate: z.string().optional(),
  credentialId: z.string().optional(),
  credentialUrl: z.string().url().or(z.string()).optional(),
});

export type Certification = z.infer<typeof CertificationSchema>;
export const NormalizedCertificationSchema = CertificationSchema;
export type NormalizedCertification = Certification;

export const SkillItemSchema = z.union([
  z.string(),
  z.object({
    name: z.string(),
    category: z.string().optional(),
    endorsements: z.number().optional(),
  }),
]);

export type SkillItem = z.infer<typeof SkillItemSchema>;

export const CompleteProfileSchema = z.object({
  fullName: z.string().optional().default(''),
  headline: z.string().default(''),
  summary: z.string().optional().default(''),
  experiences: z.array(WorkExperienceSchema).default([]),
  skills: z.array(z.string()).default([]),
  education: z.array(EducationSchema).default([]),
  certifications: z.array(CertificationSchema).optional().default([]),
  contactInfo: ContactInfoSchema.optional().default({}),
});

export type CompleteProfile = z.infer<typeof CompleteProfileSchema>;
export const CandidateProfileSchema = CompleteProfileSchema;
export type CandidateProfile = CompleteProfile;
export const NormalizedProfileSchema = CompleteProfileSchema;
export type NormalizedProfile = CompleteProfile;

export const PartialProfileSchema = CompleteProfileSchema.partial();
export type PartialProfile = z.infer<typeof PartialProfileSchema>;

// ==========================================
// 2. Job Description Schema
// ==========================================

export const JobDescriptionSchema = z.object({
  title: z.string().optional(),
  company: z.string().optional(),
  rawText: z.string().min(1, 'Job description raw text is required'),
  requiredSkills: z.array(z.string()).optional().default([]),
  preferredSkills: z.array(z.string()).optional().default([]),
  responsibilities: z.array(z.string()).optional().default([]),
  seniorityLevel: z.string().optional(),
});

export type JobDescription = z.infer<typeof JobDescriptionSchema>;

// ==========================================
// 3. Proof-of-Work Post Types & Schemas
// ==========================================

export const ProofOfWorkTypeEnum = z.enum([
  'architecture_decision',
  'performance_optimization',
  'incident_postmortem',
  'build_in_public',
  'system_migration',
  'deep_dive',
]);

export type ProofOfWorkType = z.infer<typeof ProofOfWorkTypeEnum>;

export const ProofOfWorkInputSchema = z.object({
  type: ProofOfWorkTypeEnum.optional().default('architecture_decision').describe('Category of proof-of-work engineering note'),
  technicalNotes: z.union([z.string(), z.array(z.string())]).describe('Raw engineering notes, commit summaries, or architectural notes'),
  githubUrl: z.string().optional().describe('GitHub project, pull request, or commit URL'),
  context: z.string().optional().describe('System context, scale, or business background'),
  toolsAndTech: z.array(z.string()).optional().describe('Technologies and tools used (e.g. ["Redis", "Go", "Docker"])'),
  metrics: z.array(z.string()).optional().describe('Quantifiable metrics (e.g. ["latency from 250ms to 12ms", "cut costs by 40%"])'),
  audience: z.enum(['technical_recruiter', 'hiring_manager', 'engineering_peers']).optional().default('technical_recruiter'),
});

export type ProofOfWorkInput = z.infer<typeof ProofOfWorkInputSchema>;

export const ProofOfWorkPostSchema = z.object({
  postType: ProofOfWorkTypeEnum,
  headlineHook: z.string(),
  problemContext: z.string(),
  technicalSolution: z.string(),
  quantifiableImpact: z.string(),
  engineeringTakeaway: z.string(),
  recruiterKeywords: z.array(z.string()),
  formattedMarkdownPost: z.string(),
  llmClicheScore: z.number().min(0).max(100),
  bannedClichesAvoided: z.array(z.string()),
});

export type ProofOfWorkPost = z.infer<typeof ProofOfWorkPostSchema>;

// ==========================================
// 4. Raw Profile Input Validation Schema
// ==========================================

export const RawProfileInputSchema = z.union([
  CompleteProfileSchema,
  z.string().transform((raw, ctx) => {
    try {
      const parsed = JSON.parse(raw);
      return CompleteProfileSchema.parse(parsed);
    } catch (err: any) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Failed to parse profile JSON string: ${err.message}`,
      });
      return z.NEVER;
    }
  }),
]);

export type RawProfileInput = z.infer<typeof RawProfileInputSchema>;

export const RawPartialProfileInputSchema = z.union([
  PartialProfileSchema,
  z.string().transform((raw, ctx) => {
    try {
      const parsed = JSON.parse(raw);
      return PartialProfileSchema.parse(parsed);
    } catch (err: any) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Failed to parse partial profile JSON string: ${err.message}`,
      });
      return z.NEVER;
    }
  }),
]);

// ==========================================
// 5. MCP Tool Input & Output Contracts
// ==========================================

// Tool 1: ingest_profile_document
export const IngestProfileDocumentInputSchema = z
  .object({
    filePath: z.string().optional().describe('Local file path to LinkedIn PDF export or JSON document'),
    base64: z.string().optional().describe('Base64-encoded file buffer string'),
    rawText: z.string().optional().describe('Direct raw text extracted from LinkedIn export'),
    format: z.enum(['auto', 'pdf', 'json', 'text']).optional().default('auto'),
  })
  .refine((data) => !!data.filePath || !!data.base64 || !!data.rawText, {
    message: 'At least one input source must be provided: filePath, base64, or rawText',
  });

export type IngestProfileDocumentInput = z.infer<typeof IngestProfileDocumentInputSchema>;

// Tool 2: evaluate_profile_ats
export const EvaluateProfileAtsInputSchema = z.object({
  profile: RawProfileInputSchema.describe('Candidate profile object or serialized JSON string to evaluate'),
});

export type EvaluateProfileAtsInput = z.infer<typeof EvaluateProfileAtsInputSchema>;

// Tool 3: analyze_keyword_gap
export const AnalyzeKeywordGapInputSchema = z
  .object({
    profile: RawProfileInputSchema.describe('Candidate profile object or serialized JSON string'),
    targetJobDescription: z
      .string()
      .optional()
      .describe('Full text of the target job description to analyze against'),
    targetRoleKeywords: z
      .array(z.string())
      .optional()
      .describe('Explicit list of target keywords, skills, or competencies'),
    targetRoleTitle: z
      .string()
      .optional()
      .describe('Optional target job title (e.g. "Staff Distributed Systems Engineer")'),
    maxNGram: z
      .number()
      .min(1)
      .max(4)
      .optional()
      .default(3)
      .describe('Maximum n-gram length for token extraction (default: 3)'),
  })
  .refine(
    (data) =>
      !!data.targetJobDescription || (!!data.targetRoleKeywords && data.targetRoleKeywords.length > 0),
    {
      message: 'Either targetJobDescription or targetRoleKeywords must be provided',
    }
  );

export type AnalyzeKeywordGapInput = z.infer<typeof AnalyzeKeywordGapInputSchema>;

// Tool 4: synthesize_section_patch
export const SynthesizeSectionPatchInputSchema = z.object({
  section: z
    .enum(['headline', 'about', 'roles', 'experience'])
    .describe('Profile section to synthesize and rewrite using the XYZ framework'),
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
    .describe('Current text or structured object of the targeted section'),
  targetRole: z.string().optional().describe('Target job title or specialization focus'),
  focusKeywords: z.array(z.string()).optional().describe('Keywords to weave into the synthesized patch'),
  metrics: z
    .array(z.string())
    .optional()
    .describe('Quantifiable metrics to weave into the XYZ formula (Accomplished [X] measured by [Y] by doing [Z])'),
  tone: z
    .enum(['impactful', 'executive', 'technical', 'concise'])
    .optional()
    .default('impactful')
    .describe('Stylistic tone for the synthesis (default: "impactful")'),
});

export type SynthesizeSectionPatchInput = z.infer<typeof SynthesizeSectionPatchInputSchema>;

// Tool 5: render_change_diff
export const RenderChangeDiffInputSchema = z.object({
  currentProfile: RawProfileInputSchema.describe('Baseline profile object or JSON string before changes'),
  proposedProfile: RawPartialProfileInputSchema.describe('Proposed profile or partial updates to compare against baseline'),
  format: z
    .enum(['unified', 'side_by_side', 'summary_only'])
    .optional()
    .default('unified')
    .describe('Diff rendering layout (default: "unified")'),
});

export type RenderChangeDiffInput = z.infer<typeof RenderChangeDiffInputSchema>;

// Tool 6: generate_proof_of_work / draft_proof_of_work_post
export const GenerateProofOfWorkInputSchema = ProofOfWorkInputSchema;
export type GenerateProofOfWorkInput = ProofOfWorkInput;

export const DraftProofOfWorkPostInputSchema = ProofOfWorkInputSchema;
export type DraftProofOfWorkPostInput = ProofOfWorkInput;

// AGENTS.md Tool 1: ingest_profile
export const IngestProfileInputSchema = IngestProfileDocumentInputSchema;
export type IngestProfileInput = IngestProfileDocumentInput;

// AGENTS.md Tool 2: audit_job_readiness
export const AuditJobReadinessInputSchema = EvaluateProfileAtsInputSchema;
export type AuditJobReadinessInput = EvaluateProfileAtsInput;

// AGENTS.md Tool 3: analyze_role_fit
export const AnalyzeRoleFitInputSchema = z
  .object({
    profile: RawProfileInputSchema.describe('Candidate profile object or serialized JSON string'),
    targetJobDescription: z
      .string()
      .optional()
      .describe('Full text of the target job description to analyze against'),
    targetJobDescriptions: z
      .array(z.string())
      .optional()
      .describe('List of 1 to 3 target job descriptions to analyze against'),
    targetRoleKeywords: z
      .array(z.string())
      .optional()
      .describe('Explicit list of target keywords, skills, or competencies'),
    targetRoleTitle: z
      .string()
      .optional()
      .describe('Optional target job title (e.g. "Staff Distributed Systems Engineer")'),
    maxNGram: z
      .number()
      .min(1)
      .max(4)
      .optional()
      .default(3)
      .describe('Maximum n-gram length for token extraction (default: 3)'),
  })
  .refine(
    (data) =>
      !!data.targetJobDescription ||
      (!!data.targetJobDescriptions && data.targetJobDescriptions.length > 0) ||
      (!!data.targetRoleKeywords && data.targetRoleKeywords.length > 0),
    {
      message: 'Either targetJobDescription, targetJobDescriptions, or targetRoleKeywords must be provided',
    }
  );

export type AnalyzeRoleFitInput = z.infer<typeof AnalyzeRoleFitInputSchema>;

// AGENTS.md Tool 4: synthesize_profile_diff
export const SynthesizeProfileDiffInputSchema = z.object({
  profile: RawProfileInputSchema.optional().describe('Baseline profile object or JSON string'),
  currentProfile: RawProfileInputSchema.optional().describe('Alternative baseline profile object'),
  section: z
    .enum(['headline', 'about', 'roles', 'experience'])
    .optional()
    .default('roles')
    .describe('Profile section to rewrite using the XYZ framework'),
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
    .optional()
    .describe('Current text or structured object of the targeted section'),
  targetRole: z.string().optional().describe('Target job title or specialization focus'),
  focusKeywords: z.array(z.string()).optional().describe('Keywords to weave into the synthesized patch'),
  metrics: z
    .array(z.string())
    .optional()
    .describe('Quantifiable metrics to weave into the XYZ formula'),
  tone: z
    .enum(['impactful', 'executive', 'technical', 'concise'])
    .optional()
    .default('impactful')
    .describe('Stylistic tone for synthesis'),
  proposedProfile: RawPartialProfileInputSchema.optional().describe('Directly provided proposed profile for diffing'),
  format: z
    .enum(['unified', 'side_by_side', 'summary_only'])
    .optional()
    .default('unified')
    .describe('Diff rendering layout (default: "unified")'),
});

export type SynthesizeProfileDiffInput = z.infer<typeof SynthesizeProfileDiffInputSchema>;

// AGENTS.md Tool 6: generate_passive_visibility_plan
export const PassiveVisibilityPlanInputSchema = z.object({
  targetRole: z
    .string()
    .optional()
    .default('Senior Software Engineer')
    .describe('Target role for recruiter discoverability'),
  primaryTechStack: z
    .array(z.string())
    .optional()
    .default(['TypeScript', 'Node.js', 'PostgreSQL', 'Redis', 'Docker'])
    .describe('Primary engineering technologies'),
  currentProjects: z
    .array(z.string())
    .optional()
    .describe('Current projects or architectural focus areas'),
  cadenceDays: z
    .number()
    .optional()
    .default(30)
    .describe('Duration of visibility plan in days (default: 30)'),
});

export type PassiveVisibilityPlanInput = z.infer<typeof PassiveVisibilityPlanInputSchema>;

export const PassiveVisibilityPlanSchema = z.object({
  targetRole: z.string(),
  cadenceDays: z.number(),
  recruiterDiscoveryStrategy: z.object({
    activeCandidateFilterBoost: z.string(),
    minTimeCommitmentMinutesPerWeek: z.number(),
    algorithmInsight: z.string(),
  }),
  timeline: z.array(
    z.object({
      day: z.number(),
      week: z.number(),
      actionType: z.enum(['profile_refresh', 'post', 'comment']),
      title: z.string(),
      description: z.string(),
      targetAudienceOrCreators: z.string(),
      contentPromptOrDraft: z.string(),
      estimatedMinutes: z.number(),
    })
  ),
  postDrafts: z.array(ProofOfWorkPostSchema),
  commentingBlueprints: z.array(
    z.object({
      targetType: z.string(),
      commentAngle: z.string(),
      antiCringeGuideline: z.string(),
      templateExample: z.string(),
    })
  ),
  formattedMarkdownPlan: z.string(),
});

export type PassiveVisibilityPlan = z.infer<typeof PassiveVisibilityPlanSchema>;

// Utility / tool: humanize_content
export const HumanizeContentInputSchema = z.object({
  text: z.string().min(1, 'Text to humanize is required'),
  domain: z
    .enum(['software_engineering', 'system_architecture', 'data_engineering', 'general'])
    .optional()
    .default('software_engineering'),
  targetAudience: z
    .enum(['recruiter', 'technical_peer', 'hiring_manager'])
    .optional()
    .default('recruiter'),
});

export type HumanizeContentInput = z.infer<typeof HumanizeContentInputSchema>;

