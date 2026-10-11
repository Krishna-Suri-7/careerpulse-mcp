import { z } from 'zod';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ErrorCode,
  McpError,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import {
  IngestProfileDocumentInputSchema,
  EvaluateProfileAtsInputSchema,
  AnalyzeKeywordGapInputSchema,
  SynthesizeSectionPatchInputSchema,
  RenderChangeDiffInputSchema,
  SynthesizeProfileDiffInputSchema,
  AnalyzeRoleFitInputSchema,
  DraftProofOfWorkPostInputSchema,
  PassiveVisibilityPlanInputSchema,
  HumanizeContentInputSchema,
  AuditLinkedInPageInputSchema,
} from '../contracts/profile-schema.js';
import { ingestProfileDocument } from '../ingestion/pdf-extractor.js';
import { evaluateProfileAts } from '../analytics/ats-engine.js';
import { auditLinkedInLandingPage } from '../analytics/linkedin-scorer.js';
import { analyzeKeywordGapEngine } from '../analytics/keyword-analyzer.js';
import {
  synthesizeSectionPatchEngine,
  renderChangeDiffEngine,
} from '../patching/diff-patcher.js';
import {
  generateProofOfWorkPost,
  generatePassiveVisibilityPlan,
} from '../visibility/proof-of-work.js';
import { humanizeEngineeringText } from '../visibility/humanizer.js';
import { PROMPT_REGISTRY } from './prompt-registry.js';

export interface McpToolResponse {
  content: { type: 'text'; text: string }[];
  isError: boolean;
  [key: string]: unknown;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, z.ZodTypeAny>;
  handler: (args: any) => Promise<McpToolResponse>;
}

/**
 * Clean dictionary dispatch mapping MCP tools to domain engines
 */
export const TOOL_REGISTRY: Record<string, ToolDefinition> = {
  // ========================================================
  // AGENTS.md Tool 1: ingest_profile / ingest_profile_document
  // ========================================================
  ingest_profile: {
    name: 'ingest_profile',
    description:
      'Parses a local LinkedIn export PDF or resume JSON into the normalized Zod model.',
    parameters: {
      filePath: z
        .string()
        .optional()
        .describe('Local file path to LinkedIn PDF export or JSON document'),
      base64: z
        .string()
        .optional()
        .describe('Base64-encoded string of the LinkedIn export file'),
      rawText: z
        .string()
        .optional()
        .describe('Direct raw text extracted from LinkedIn export'),
      format: z
        .enum(['auto', 'pdf', 'json', 'text'])
        .optional()
        .describe('Document format (default: "auto")'),
    },
    handler: async (args: unknown): Promise<McpToolResponse> => {
      try {
        const validated = IngestProfileDocumentInputSchema.parse(args);
        const result = await ingestProfileDocument(validated);

        const payload = {
          success: true,
          sourceType: result.sourceType,
          numPages: result.numPages,
          profile: result.profile,
          stats: {
            rolesCount: result.profile.experiences.length,
            skillsCount: result.profile.skills.length,
            educationCount: result.profile.education.length,
          },
        };

        return {
          content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }],
          isError: false,
        };
      } catch (err: any) {
        return {
          content: [{ type: 'text', text: `Failed to ingest profile: ${err.message || String(err)}` }],
          isError: true,
        };
      }
    },
  },

  // ========================================================
  // AGENTS.md Tool 2: audit_job_readiness / evaluate_profile_ats
  // ========================================================
  audit_job_readiness: {
    name: 'audit_job_readiness',
    description:
      'Calculates a 0-100 ATS readiness score with actionable metric-based fixes.',
    parameters: {
      profile: z
        .any()
        .describe('LinkedIn profile object or serialized JSON string to evaluate'),
    },
    handler: async (args: unknown): Promise<McpToolResponse> => {
      try {
        const validated = EvaluateProfileAtsInputSchema.parse(args);
        const evaluation = evaluateProfileAts(validated.profile);

        const payload = {
          compositeScore: evaluation.compositeScore,
          factors: evaluation.factors,
          sectionBreakdown: evaluation.sectionBreakdown,
          strengths: evaluation.strengths,
          weaknesses: evaluation.weaknesses,
          criticalRemediations: evaluation.criticalRemediations,
          actionablePlan: evaluation.actionablePlan,
          bulletAudits: evaluation.bulletAudits,
        };

        return {
          content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }],
          isError: false,
        };
      } catch (err: any) {
        return {
          content: [{ type: 'text', text: `Failed to evaluate profile ATS: ${err.message || String(err)}` }],
          isError: true,
        };
      }
    },
  },

  // ========================================================
  // AGENTS.md Tool 3: analyze_role_fit / analyze_keyword_gap
  // ========================================================
  analyze_role_fit: {
    name: 'analyze_role_fit',
    description:
      'Compares candidate profile against 1-3 target Job Descriptions to surface missing boolean search terms.',
    parameters: {
      profile: z
        .any()
        .describe('Candidate profile object or serialized JSON string'),
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
        .optional()
        .describe('Maximum n-gram length for token extraction (default: 3)'),
    },
    handler: async (args: unknown): Promise<McpToolResponse> => {
      try {
        const validated = AnalyzeRoleFitInputSchema.parse(args);
        const combinedJd =
          validated.targetJobDescription ||
          (validated.targetJobDescriptions ? validated.targetJobDescriptions.join('\n\n') : undefined);

        const analysis = analyzeKeywordGapEngine(validated.profile, {
          targetJobDescription: combinedJd,
          targetRoleKeywords: validated.targetRoleKeywords,
          targetRoleTitle: validated.targetRoleTitle,
          maxNGram: validated.maxNGram,
        });

        // Formulate Boolean search terms for recruiters
        const matchedHard = analysis.hardSkills.matched;
        const missingHard = analysis.hardSkills.missing;
        const recruiterMatchedQuery =
          matchedHard.length > 0
            ? `(${matchedHard.slice(0, 5).map((s) => `"${s}"`).join(' OR ')})`
            : '';
        const missingBooleanKeywords = missingHard.slice(0, 8);
        const recruiterGapQuery =
          missingBooleanKeywords.length > 0
            ? `(${missingBooleanKeywords.slice(0, 4).map((s) => `"${s}"`).join(' OR ')})`
            : '';

        const payload = {
          matchScore: analysis.matchScore,
          totalIdentified: analysis.totalIdentified,
          matchedCount: analysis.matchedCount,
          missingCount: analysis.missingCount,
          hardSkills: analysis.hardSkills,
          softSkills: analysis.softSkills,
          missingBooleanKeywords,
          recruiterBooleanSearchQueries: {
            candidateMatchingQuery: recruiterMatchedQuery,
            missingKeywordsQuery: recruiterGapQuery,
            sampleRecruiterBooleanString:
              recruiterMatchedQuery && recruiterGapQuery
                ? `${recruiterMatchedQuery} AND ${recruiterGapQuery}`
                : recruiterMatchedQuery || recruiterGapQuery,
          },
          strategicPlacements: analysis.strategicPlacements,
          details: analysis.details,
        };

        return {
          content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }],
          isError: false,
        };
      } catch (err: any) {
        return {
          content: [{ type: 'text', text: `Failed to analyze role fit: ${err.message || String(err)}` }],
          isError: true,
        };
      }
    },
  },

  // ========================================================
  // AGENTS.md Tool 4: synthesize_profile_diff
  // ========================================================
  synthesize_profile_diff: {
    name: 'synthesize_profile_diff',
    description:
      'Rewrites headline, summary, or bullets using the XYZ metric formula, returning clean Markdown diffs.',
    parameters: {
      profile: z
        .any()
        .optional()
        .describe('Baseline profile object or JSON string to update and diff'),
      currentProfile: z
        .any()
        .optional()
        .describe('Alternative alias for baseline candidate profile'),
      section: z
        .enum(['headline', 'about', 'roles', 'experience'])
        .optional()
        .describe('Profile section to rewrite using the XYZ framework (default: "roles")'),
      currentContent: z
        .any()
        .optional()
        .describe('Current text or object describing the targeted section'),
      targetRole: z
        .string()
        .optional()
        .describe('Target role or specialization title'),
      focusKeywords: z
        .array(z.string())
        .optional()
        .describe('Keywords to weave into the XYZ formula'),
      metrics: z
        .array(z.string())
        .optional()
        .describe('Quantifiable metrics to weave into the XYZ formula'),
      tone: z
        .enum(['impactful', 'executive', 'technical', 'concise'])
        .optional()
        .describe('Stylistic tone for synthesis (default: "impactful")'),
      proposedProfile: z
        .any()
        .optional()
        .describe('Optional direct proposed profile object or JSON string to diff against baseline'),
      format: z
        .enum(['unified', 'side_by_side', 'summary_only'])
        .optional()
        .describe('Diff rendering layout (default: "unified")'),
    },
    handler: async (args: unknown): Promise<McpToolResponse> => {
      try {
        const validated = SynthesizeProfileDiffInputSchema.parse(args);
        const baseline = validated.profile || validated.currentProfile;
        const section = validated.section || 'roles';

        // Case 1: Proposed profile is directly provided -> diff against baseline
        if (validated.proposedProfile && baseline) {
          const diffResult = renderChangeDiffEngine(
            baseline,
            validated.proposedProfile,
            validated.format
          );
          return {
            content: [{ type: 'text', text: JSON.stringify(diffResult, null, 2) }],
            isError: false,
          };
        }

        // Case 2: Synthesize patch using XYZ formula
        let currentContent = validated.currentContent;
        if (!currentContent && baseline) {
          if (typeof baseline === 'object') {
            if (section === 'headline') currentContent = baseline.headline || '';
            else if (section === 'about') currentContent = baseline.summary || '';
            else if (section === 'roles' || section === 'experience') {
              currentContent = baseline.experiences?.[0]?.bulletPoints?.join('\n') || '';
            }
          }
        }

        if (!currentContent) {
          currentContent = 'Senior Software Engineer responsible for building core backend services.';
        }

        const patch = synthesizeSectionPatchEngine({
          section,
          currentContent,
          targetRole: validated.targetRole,
          focusKeywords: validated.focusKeywords,
          metrics: validated.metrics,
          tone: validated.tone,
        });

        // If baseline profile is available, produce updated proposed profile and unified diff
        let diffReport: any = null;
        if (baseline && typeof baseline === 'object') {
          const proposed: any = { ...baseline };
          if (section === 'headline') proposed.headline = patch.synthesizedContent;
          else if (section === 'about') proposed.summary = patch.synthesizedContent;
          else if (section === 'roles' || section === 'experience') {
            const exps = Array.isArray(baseline.experiences) ? [...baseline.experiences] : [];
            if (exps.length > 0) {
              exps[0] = {
                ...exps[0],
                bulletPoints: patch.synthesizedContent
                  .split('\n')
                  .filter((l: string) => l.trim().length > 0),
              };
            }
            proposed.experiences = exps;
          }
          diffReport = renderChangeDiffEngine(baseline, proposed, validated.format);
        }

        const payload = {
          success: true,
          section,
          synthesizedContent: patch.synthesizedContent,
          xyzComponents: patch.xyzComponents,
          diffPreview: patch.markdownDiff,
          diffReport: diffReport || { markdownReport: patch.markdownDiff },
          markdownDiff: diffReport ? diffReport.markdownReport : patch.markdownDiff,
        };

        return {
          content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }],
          isError: false,
        };
      } catch (err: any) {
        return {
          content: [{ type: 'text', text: `Failed to synthesize profile diff: ${err.message || String(err)}` }],
          isError: true,
        };
      }
    },
  },

  // ========================================================
  // AGENTS.md Tool 5: draft_proof_of_work_post / generate_proof_of_work
  // ========================================================
  draft_proof_of_work_post: {
    name: 'draft_proof_of_work_post',
    description:
      'Takes a GitHub project link, commit summary, or technical takeaway and drafts a concise, high-signal post (under 180 words) to signal candidate activity to recruiters.',
    parameters: {
      type: z
        .enum([
          'architecture_decision',
          'performance_optimization',
          'incident_postmortem',
          'build_in_public',
          'system_migration',
          'deep_dive',
        ])
        .optional()
        .describe('Category of proof-of-work engineering note'),
      technicalNotes: z
        .union([z.string(), z.array(z.string())])
        .describe('Raw engineering notes, commit summaries, or architectural notes'),
      githubUrl: z
        .string()
        .optional()
        .describe('GitHub project, pull request, or commit URL'),
      context: z
        .string()
        .optional()
        .describe('System context, scale, or business background'),
      toolsAndTech: z
        .array(z.string())
        .optional()
        .describe('Technologies and tools used (e.g. ["Redis", "Go", "Docker"])'),
      metrics: z
        .array(z.string())
        .optional()
        .describe('Quantifiable metrics (e.g. ["latency from 250ms to 12ms", "cut costs by 40%"])'),
      audience: z
        .enum(['technical_recruiter', 'hiring_manager', 'engineering_peers'])
        .optional()
        .describe('Audience target (default: "technical_recruiter")'),
    },
    handler: async (args: unknown): Promise<McpToolResponse> => {
      try {
        const validated = DraftProofOfWorkPostInputSchema.parse(args);
        const post = generateProofOfWorkPost(validated);
        const words = post.formattedMarkdownPost.split(/\s+/).filter(Boolean);

        const payload = {
          success: true,
          postType: post.postType,
          headlineHook: post.headlineHook,
          problemContext: post.problemContext,
          technicalSolution: post.technicalSolution,
          quantifiableImpact: post.quantifiableImpact,
          engineeringTakeaway: post.engineeringTakeaway,
          recruiterKeywords: post.recruiterKeywords,
          formattedMarkdownPost: post.formattedMarkdownPost,
          wordCount: words.length,
          isUnder180Words: words.length <= 180,
          llmClicheScore: post.llmClicheScore,
          bannedClichesAvoided: post.bannedClichesAvoided,
        };

        return {
          content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }],
          isError: false,
        };
      } catch (err: any) {
        return {
          content: [{ type: 'text', text: `Failed to draft proof of work post: ${err.message || String(err)}` }],
          isError: true,
        };
      }
    },
  },

  // ========================================================
  // AGENTS.md Tool 6: generate_passive_visibility_plan
  // ========================================================
  generate_passive_visibility_plan: {
    name: 'generate_passive_visibility_plan',
    description:
      'Builds a minimal 30-day schedule requiring only 2 technical posts and 4 targeted comments to stay active in LinkedIn\'s candidate discovery algorithm.',
    parameters: {
      targetRole: z
        .string()
        .optional()
        .describe('Target role for recruiter discoverability'),
      primaryTechStack: z
        .array(z.string())
        .optional()
        .describe('Primary engineering technologies'),
      currentProjects: z
        .array(z.string())
        .optional()
        .describe('Current projects or architectural focus areas'),
      cadenceDays: z
        .number()
        .optional()
        .describe('Duration of visibility plan in days (default: 30)'),
    },
    handler: async (args: unknown): Promise<McpToolResponse> => {
      try {
        const validated = PassiveVisibilityPlanInputSchema.parse(args);
        const plan = generatePassiveVisibilityPlan(validated);

        return {
          content: [{ type: 'text', text: JSON.stringify(plan, null, 2) }],
          isError: false,
        };
      } catch (err: any) {
        return {
          content: [{ type: 'text', text: `Failed to generate passive visibility plan: ${err.message || String(err)}` }],
          isError: true,
        };
      }
    },
  },

  // ========================================================
  // Specific Core Engines & Utilities
  // ========================================================
  synthesize_section_patch: {
    name: 'synthesize_section_patch',
    description:
      'Rewrites targeted sections (Headline, About, Roles) applying the XYZ impact framework (Accomplished [X], measured by [Y], by doing [Z]).',
    parameters: {
      section: z
        .enum(['headline', 'about', 'roles', 'experience'])
        .describe('Section to rewrite ("headline", "about", or "roles")'),
      currentContent: z
        .any()
        .describe('Current text or object describing the targeted section'),
      targetRole: z
        .string()
        .optional()
        .describe('Target role or specialization title'),
      focusKeywords: z
        .array(z.string())
        .optional()
        .describe('Keywords to incorporate into the rewrite'),
      metrics: z
        .array(z.string())
        .optional()
        .describe('Quantifiable metrics to weave into the XYZ formula'),
      tone: z
        .enum(['impactful', 'executive', 'technical', 'concise'])
        .optional()
        .describe('Stylistic tone for synthesis (default: "impactful")'),
    },
    handler: async (args: unknown): Promise<McpToolResponse> => {
      try {
        const validated = SynthesizeSectionPatchInputSchema.parse(args);
        const patch = synthesizeSectionPatchEngine(validated);

        return {
          content: [{ type: 'text', text: JSON.stringify(patch, null, 2) }],
          isError: false,
        };
      } catch (err: any) {
        return {
          content: [{ type: 'text', text: `Failed to synthesize section patch: ${err.message || String(err)}` }],
          isError: true,
        };
      }
    },
  },

  render_change_diff: {
    name: 'render_change_diff',
    description:
      'Generates clean Markdown side-by-side or line-by-line diffs of proposed changes.',
    parameters: {
      currentProfile: z
        .any()
        .describe('Baseline profile object or JSON string before changes'),
      proposedProfile: z
        .any()
        .describe('Proposed profile or partial updates to compare against baseline'),
      format: z
        .enum(['unified', 'side_by_side', 'summary_only'])
        .optional()
        .describe('Diff output format (default: "unified")'),
    },
    handler: async (args: unknown): Promise<McpToolResponse> => {
      try {
        const validated = RenderChangeDiffInputSchema.parse(args);
        const diff = renderChangeDiffEngine(
          validated.currentProfile,
          validated.proposedProfile,
          validated.format
        );

        return {
          content: [{ type: 'text', text: JSON.stringify(diff, null, 2) }],
          isError: false,
        };
      } catch (err: any) {
        return {
          content: [{ type: 'text', text: `Failed to render change diff: ${err.message || String(err)}` }],
          isError: true,
        };
      }
    },
  },

  humanize_content: {
    name: 'humanize_content',
    description:
      'Strips predictable LLM clichés (e.g., "delve", "testament", "supercharge", "thrilled to announce") and formats text with authentic engineering voice.',
    parameters: {
      text: z.string().describe('Text to inspect and remove AI clichés from'),
      domain: z
        .enum(['software_engineering', 'system_architecture', 'data_engineering', 'general'])
        .optional()
        .describe('Engineering domain context'),
      targetAudience: z
        .enum(['recruiter', 'technical_peer', 'hiring_manager'])
        .optional()
        .describe('Target audience'),
    },
    handler: async (args: unknown): Promise<McpToolResponse> => {
      try {
        const validated = HumanizeContentInputSchema.parse(args);
        const result = humanizeEngineeringText(validated.text);

        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          isError: false,
        };
      } catch (err: any) {
        return {
          content: [{ type: 'text', text: `Failed to humanize content: ${err.message || String(err)}` }],
          isError: true,
        };
      }
    },
  },

  get_workflow_preset: {
    name: 'get_workflow_preset',
    description:
      'Returns guided 1-click workflow preset instructions for non-technical users ("audit-my-profile", "target-job-fit", "write-proof-of-work", "30-day-visibility-plan").',
    parameters: {
      preset: z
        .enum(['audit-my-profile', 'target-job-fit', 'write-proof-of-work', '30-day-visibility-plan'])
        .describe('Workflow preset name'),
      filePath: z.string().optional().describe('Optional local file path to LinkedIn PDF/JSON export'),
      targetRole: z.string().optional().describe('Optional target job title'),
      targetJobDescription: z.string().optional().describe('Optional target job description text'),
      technicalNotes: z.string().optional().describe('Optional engineering notes or commit summary'),
    },
    handler: async (args: any): Promise<McpToolResponse> => {
      try {
        const presetName = args?.preset || 'audit-my-profile';
        const promptDef = PROMPT_REGISTRY[presetName];
        if (!promptDef) {
          return {
            content: [
              {
                type: 'text',
                text: `Unknown preset: ${presetName}. Available presets: ${Object.keys(PROMPT_REGISTRY).join(', ')}`,
              },
            ],
            isError: true,
          };
        }
        const promptResult = await promptDef.handler(args);
        const firstMsgContent = promptResult.messages[0]?.content;
        const messageText =
          firstMsgContent && 'text' in firstMsgContent ? (firstMsgContent as any).text : '';
        return {
          content: [{ type: 'text', text: messageText }],
          isError: false,
        };
      } catch (err: any) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to load workflow preset: ${err.message || String(err)}`,
            },
          ],
          isError: true,
        };
      }
    },
  },

  audit_linkedin_page: {
    name: 'audit_linkedin_page',
    description:
      'Evaluates candidate profile as a searchable LinkedIn SEO landing page (0-100) across headline hook, above-the-fold About copy, proof-of-work metrics, skills alignment, and 30-day activity recency.',
    parameters: {
      profile: z
        .any()
        .describe('LinkedIn profile object or serialized JSON string to evaluate'),
      targetRole: z
        .string()
        .optional()
        .describe('Optional target job title or specialization (e.g. "Senior Backend Engineer")'),
      activityDaysAgo: z
        .number()
        .optional()
        .describe('Days since last public activity or post (defaults to checking current role recency)'),
      recentPostText: z
        .string()
        .optional()
        .describe('Optional text of most recent post to verify 30-day activity status'),
    },
    handler: async (args: unknown): Promise<McpToolResponse> => {
      try {
        const validated = AuditLinkedInPageInputSchema.parse(args);
        const result = auditLinkedInLandingPage(validated.profile, {
          targetRole: validated.targetRole,
          activityDaysAgo: validated.activityDaysAgo,
          recentPostText: validated.recentPostText,
        });

        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          isError: false,
        };
      } catch (err: any) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to audit LinkedIn landing page: ${err.message || String(err)}`,
            },
          ],
          isError: true,
        };
      }
    },
  },
};

// Aliases for seamless interoperability across conventions
TOOL_REGISTRY['ingest_profile_document'] = {
  ...TOOL_REGISTRY['ingest_profile'],
  name: 'ingest_profile_document',
};
TOOL_REGISTRY['evaluate_profile_ats'] = {
  ...TOOL_REGISTRY['audit_job_readiness'],
  name: 'evaluate_profile_ats',
};
TOOL_REGISTRY['analyze_keyword_gap'] = {
  ...TOOL_REGISTRY['analyze_role_fit'],
  name: 'analyze_keyword_gap',
};
TOOL_REGISTRY['generate_proof_of_work'] = {
  ...TOOL_REGISTRY['draft_proof_of_work_post'],
  name: 'generate_proof_of_work',
};

// Legacy tool names
TOOL_REGISTRY['parse_profile_pdf'] = {
  ...TOOL_REGISTRY['ingest_profile'],
  name: 'parse_profile_pdf',
};
TOOL_REGISTRY['audit_profile'] = {
  ...TOOL_REGISTRY['audit_job_readiness'],
  name: 'audit_profile',
};
TOOL_REGISTRY['keyword_gap_analysis'] = {
  ...TOOL_REGISTRY['analyze_role_fit'],
  name: 'keyword_gap_analysis',
};
TOOL_REGISTRY['rewrite_section'] = {
  ...TOOL_REGISTRY['synthesize_section_patch'],
  name: 'rewrite_section',
};
TOOL_REGISTRY['export_profile_diff'] = {
  ...TOOL_REGISTRY['render_change_diff'],
  name: 'export_profile_diff',
};

/**
 * MCP Tool definitions formatted for ListToolsRequestSchema
 */
export const TOOL_DEFINITIONS: Tool[] = [
  {
    name: 'ingest_profile',
    description: 'Parses a local LinkedIn export PDF or resume JSON into the normalized Zod model.',
    inputSchema: {
      type: 'object',
      properties: {
        filePath: { type: 'string', description: 'Local file path to LinkedIn PDF export or JSON document' },
        base64: { type: 'string', description: 'Base64-encoded string of the LinkedIn export file' },
        rawText: { type: 'string', description: 'Direct raw text extracted from LinkedIn export' },
        format: { type: 'string', enum: ['auto', 'pdf', 'json', 'text'], description: 'Document format (default: "auto")' },
      },
    },
  },
  {
    name: 'audit_job_readiness',
    description: 'Calculates a 0-100 ATS readiness score with actionable metric-based fixes.',
    inputSchema: {
      type: 'object',
      properties: {
        profile: { description: 'LinkedIn profile object or serialized JSON string to evaluate' },
      },
      required: ['profile'],
    },
  },
  {
    name: 'analyze_role_fit',
    description: 'Compares candidate profile against 1-3 target Job Descriptions to surface missing boolean search terms.',
    inputSchema: {
      type: 'object',
      properties: {
        profile: { description: 'Candidate profile object or serialized JSON string' },
        targetJobDescription: { type: 'string', description: 'Full text of the target job description to analyze against' },
        targetJobDescriptions: { type: 'array', items: { type: 'string' }, description: 'List of 1 to 3 target job descriptions' },
        targetRoleKeywords: { type: 'array', items: { type: 'string' }, description: 'Explicit list of target keywords, skills, or competencies' },
        targetRoleTitle: { type: 'string', description: 'Optional target job title (e.g. "Staff Distributed Systems Engineer")' },
        maxNGram: { type: 'number', description: 'Maximum n-gram length for token extraction (default: 3)' },
      },
      required: ['profile'],
    },
  },
  {
    name: 'synthesize_profile_diff',
    description: 'Rewrites headline, summary, or bullets using the XYZ metric formula, returning clean Markdown diffs.',
    inputSchema: {
      type: 'object',
      properties: {
        profile: { description: 'Baseline profile object or JSON string to update and diff' },
        currentProfile: { description: 'Alternative alias for baseline candidate profile' },
        section: { type: 'string', enum: ['headline', 'about', 'roles', 'experience'], description: 'Profile section to rewrite using the XYZ framework (default: "roles")' },
        currentContent: { description: 'Current text or object describing the targeted section' },
        targetRole: { type: 'string', description: 'Target role or specialization title' },
        focusKeywords: { type: 'array', items: { type: 'string' }, description: 'Keywords to weave into the XYZ formula' },
        metrics: { type: 'array', items: { type: 'string' }, description: 'Quantifiable metrics to weave into the XYZ formula' },
        tone: { type: 'string', enum: ['impactful', 'executive', 'technical', 'concise'], description: 'Stylistic tone for synthesis (default: "impactful")' },
        proposedProfile: { description: 'Optional direct proposed profile object or JSON string to diff against baseline' },
        format: { type: 'string', enum: ['unified', 'side_by_side', 'summary_only'], description: 'Diff rendering layout (default: "unified")' },
      },
    },
  },
  {
    name: 'draft_proof_of_work_post',
    description: 'Takes a GitHub project link, commit summary, or technical takeaway and drafts a concise, high-signal post (under 180 words) to signal candidate activity to recruiters.',
    inputSchema: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['architecture_decision', 'performance_optimization', 'incident_postmortem', 'build_in_public', 'system_migration', 'deep_dive'],
          description: 'Category of proof-of-work engineering note',
        },
        technicalNotes: { description: 'Raw engineering notes, commit summaries, or architectural notes' },
        githubUrl: { type: 'string', description: 'GitHub project, pull request, or commit URL' },
        context: { type: 'string', description: 'System context, scale, or business background' },
        toolsAndTech: { type: 'array', items: { type: 'string' }, description: 'Technologies and tools used' },
        metrics: { type: 'array', items: { type: 'string' }, description: 'Quantifiable metrics' },
        audience: { type: 'string', enum: ['technical_recruiter', 'hiring_manager', 'engineering_peers'], description: 'Audience target' },
      },
      required: ['technicalNotes'],
    },
  },
  {
    name: 'generate_passive_visibility_plan',
    description: "Builds a minimal 30-day schedule requiring only 2 technical posts and 4 targeted comments to stay active in LinkedIn's candidate discovery algorithm.",
    inputSchema: {
      type: 'object',
      properties: {
        targetRole: { type: 'string', description: 'Target role for recruiter discoverability' },
        primaryTechStack: { type: 'array', items: { type: 'string' }, description: 'Primary engineering technologies' },
        currentProjects: { type: 'array', items: { type: 'string' }, description: 'Current projects or architectural focus areas' },
        cadenceDays: { type: 'number', description: 'Duration of visibility plan in days (default: 30)' },
      },
    },
  },
  {
    name: 'humanize_content',
    description: 'Strips predictable LLM clichés (e.g., "delve", "testament", "supercharge", "thrilled to announce") and formats text with authentic engineering voice.',
    inputSchema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'Text to inspect and remove AI clichés from' },
        domain: { type: 'string', enum: ['software_engineering', 'system_architecture', 'data_engineering', 'general'], description: 'Engineering domain context' },
        targetAudience: { type: 'string', enum: ['recruiter', 'technical_peer', 'hiring_manager'], description: 'Target audience' },
      },
      required: ['text'],
    },
  },
  {
    name: 'synthesize_section_patch',
    description: 'Rewrites targeted sections (Headline, About, Roles) applying the XYZ impact framework (Accomplished [X], measured by [Y], by doing [Z]).',
    inputSchema: {
      type: 'object',
      properties: {
        section: { type: 'string', enum: ['headline', 'about', 'roles', 'experience'] },
        currentContent: { description: 'Current text or object describing the targeted section' },
        targetRole: { type: 'string' },
        focusKeywords: { type: 'array', items: { type: 'string' } },
        metrics: { type: 'array', items: { type: 'string' } },
        tone: { type: 'string', enum: ['impactful', 'executive', 'technical', 'concise'] },
      },
      required: ['section', 'currentContent'],
    },
  },
  {
    name: 'render_change_diff',
    description: 'Generates clean Markdown side-by-side or line-by-line diffs of proposed changes.',
    inputSchema: {
      type: 'object',
      properties: {
        currentProfile: { description: 'Baseline profile object or JSON string before changes' },
        proposedProfile: { description: 'Proposed profile or partial updates to compare against baseline' },
        format: { type: 'string', enum: ['unified', 'side_by_side', 'summary_only'] },
      },
      required: ['currentProfile', 'proposedProfile'],
    },
  },
  {
    name: 'get_workflow_preset',
    description:
      'Returns 1-click guided workflow preset instructions: "audit-my-profile", "target-job-fit", "write-proof-of-work", or "30-day-visibility-plan".',
    inputSchema: {
      type: 'object',
      properties: {
        preset: {
          type: 'string',
          enum: ['audit-my-profile', 'target-job-fit', 'write-proof-of-work', '30-day-visibility-plan'],
          description: 'Workflow preset name',
        },
        filePath: { type: 'string', description: 'Optional local file path to LinkedIn PDF/JSON export' },
        targetRole: { type: 'string', description: 'Optional target job title' },
        targetJobDescription: { type: 'string', description: 'Optional target job description text' },
        technicalNotes: { type: 'string', description: 'Optional engineering notes or commit summary' },
      },
      required: ['preset'],
    },
  },
];

/**
 * Registers ListToolsRequestSchema and CallToolRequestSchema on the MCP Server instance
 */
export function registerToolHandlers(server: Server): void {
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools: TOOL_DEFINITIONS };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    const tool = TOOL_REGISTRY[name];
    if (!tool) {
      throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
    }
    return await tool.handler(args || {});
  });
}

