import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  ErrorCode,
  McpError,
  Prompt,
  GetPromptResult,
  PromptArgument,
} from '@modelcontextprotocol/sdk/types.js';

export interface PromptDefinition {
  name: string;
  description: string;
  arguments?: PromptArgument[];
  handler: (args?: Record<string, string>) => Promise<GetPromptResult> | GetPromptResult;
}

/**
 * 4 Mandatory 1-Click Interactive Prompt Presets defined in AGENTS.md
 */
export const PROMPT_REGISTRY: Record<string, PromptDefinition> = {
  // Preset 1: audit-my-profile
  'audit-my-profile': {
    name: 'audit-my-profile',
    description:
      '1-Click ATS audit preset: Evaluates profile impact metrics, verb strength, and bullet completeness.',
    arguments: [
      {
        name: 'filePath',
        description: 'Local file path to LinkedIn PDF export or JSON document',
        required: false,
      },
      {
        name: 'rawProfileText',
        description: 'Raw text of the LinkedIn profile if file path is unavailable',
        required: false,
      },
      {
        name: 'targetRole',
        description: 'Target job title for context (e.g. "Senior Backend Engineer")',
        required: false,
      },
    ],
    handler: (args?: Record<string, string>): GetPromptResult => {
      const filePath = args?.filePath;
      const rawText = args?.rawProfileText;
      const targetRole = args?.targetRole || 'Senior Software Engineer';

      let promptInstruction = `You are the CareerPulse Career Intelligence Engine.\nYour objective is to perform a thorough, quantitative ATS readiness audit on the candidate's profile targeting "${targetRole}".\n\n`;

      if (filePath) {
        promptInstruction += `1. Call the "ingest_profile" tool with filePath: "${filePath}".\n`;
        promptInstruction += `2. Take the ingested profile and call the "audit_job_readiness" tool.\n`;
      } else if (rawText) {
        promptInstruction += `1. Call the "ingest_profile" tool with rawText: ${JSON.stringify(rawText)}.\n`;
        promptInstruction += `2. Take the ingested profile and call the "audit_job_readiness" tool.\n`;
      } else {
        promptInstruction += `1. Ask the candidate to provide the local path to their LinkedIn PDF export (e.g. "C:\\Users\\...\\Profile.pdf") or paste their profile text.\n`;
        promptInstruction += `2. Once provided, call "ingest_profile" followed by "audit_job_readiness".\n`;
      }

      promptInstruction +=
        `\nUpon receiving the audit results, provide:\n` +
        `- **Overall ATS Score (0-100)** broken into Impact Metrics (35%), Verb Strength (30%), Section Completeness (25%), and Readability (10%).\n` +
        `- **Top 3 Weakest Bullet Points** with diagnostic breakdown of why they lack impact.\n` +
        `- **Rewritten Bullets** transformed using Google's XYZ formula (Accomplished [X] measured by [Y] by doing [Z]).\n` +
        `- **Actionable Remediation Checklist** prioritized by ROI to maximize recruiter reach.`;

      return {
        description: 'Profile ATS readiness audit instructions',
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: promptInstruction,
            },
          },
        ],
      };
    },
  },

  // Preset 2: target-job-fit
  'target-job-fit': {
    name: 'target-job-fit',
    description:
      '1-Click Role Fit preset: Compares candidate profile against target job descriptions to surface hard/soft skill gaps and recruiter boolean search queries.',
    arguments: [
      {
        name: 'targetJobDescription',
        description: 'Full text of the target job description to match against',
        required: true,
      },
      {
        name: 'filePath',
        description: 'Local file path to candidate LinkedIn PDF export',
        required: false,
      },
      {
        name: 'targetRoleTitle',
        description: 'Target job title (e.g. "Staff Distributed Systems Engineer")',
        required: false,
      },
    ],
    handler: (args?: Record<string, string>): GetPromptResult => {
      const jd = args?.targetJobDescription;
      const filePath = args?.filePath;
      const roleTitle = args?.targetRoleTitle || 'Target Role';

      let instruction = `You are the CareerPulse Role Fit & Keyword Intelligence assistant.\nYour objective is to analyze skill overlap, identify keyword gaps, and generate the exact boolean query technical recruiters use to search for "${roleTitle}".\n\n`;

      if (filePath) {
        instruction += `1. Ingest profile from "${filePath}" using "ingest_profile".\n`;
        instruction += `2. Call "analyze_role_fit" with the parsed profile and the target job description.\n\n`;
      } else {
        instruction += `1. Call "analyze_role_fit" using the candidate's loaded profile and the target job description.\n\n`;
      }

      if (jd) {
        instruction += `Target Job Description:\n\`\`\`text\n${jd}\n\`\`\`\n\n`;
      } else {
        instruction += `[Please request the target job description text if not already provided]\n\n`;
      }

      instruction +=
        `Output requirements:\n` +
        `- **Match Percentage (%)** and matched hard/soft skills.\n` +
        `- **Missing Hard Competencies** categorized by priority.\n` +
        `- **Recruiter Boolean Search Query String** that headhunters and sourcers will run in LinkedIn Recruiter.\n` +
        `- **Strategic Keyword Placements** recommended for Headline, Skills, and Experience bullets.`;

      return {
        description: 'Role fit and keyword gap analysis instructions',
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: instruction,
            },
          },
        ],
      };
    },
  },

  // Preset 3: write-proof-of-work
  'write-proof-of-work': {
    name: 'write-proof-of-work',
    description:
      '1-Click Proof-of-Work preset: Converts engineering project notes, commits, or architecture trade-offs into a crisp recruiter post (<180 words, zero AI slop).',
    arguments: [
      {
        name: 'technicalNotes',
        description: 'Raw engineering notes, commit summaries, or architectural trade-offs',
        required: true,
      },
      {
        name: 'type',
        description:
          'Category: architecture_decision, performance_optimization, incident_postmortem, build_in_public, system_migration, or deep_dive',
        required: false,
      },
      {
        name: 'githubUrl',
        description: 'GitHub repository or pull request URL',
        required: false,
      },
      {
        name: 'metrics',
        description: 'Quantifiable metrics (e.g. "reduced p99 latency by 45%")',
        required: false,
      },
    ],
    handler: (args?: Record<string, string>): GetPromptResult => {
      const notes = args?.technicalNotes;
      const type = args?.type || 'architecture_decision';
      const githubUrl = args?.githubUrl;
      const metrics = args?.metrics;

      let instruction = `You are the CareerPulse Technical Visibility assistant.\nYour objective is to generate an authentic, high-signal LinkedIn proof-of-work post tailored for technical recruiters and hiring managers.\n\n`;
      instruction +=
        `Call the "draft_proof_of_work_post" tool with:\n` +
        `- Type: "${type}"\n` +
        `- Technical Notes: ${JSON.stringify(notes || 'Implemented architectural improvements')}\n` +
        (githubUrl ? `- GitHub URL: "${githubUrl}"\n` : '') +
        (metrics ? `- Metrics: ["${metrics}"]\n` : '') +
        `\nFormatting & Tone Rules:\n` +
        `1. Strict word count limit: Under 180 words.\n` +
        `2. Zero performative AI clichés or corporate humblebragging (Banned: "thrilled to announce", "supercharge", "delve into", "a testament to").\n` +
        `3. Grounded engineering trade-offs, constraints, and concrete takeaways.\n` +
        `4. Include 4-6 high-intent technical hashtags.`;

      return {
        description: 'Proof-of-work technical post drafting instructions',
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: instruction,
            },
          },
        ],
      };
    },
  },

  // Preset 4: 30-day-visibility-plan
  '30-day-visibility-plan': {
    name: '30-day-visibility-plan',
    description:
      '1-Click Visibility Planner: Generates a minimal 30-day schedule (2 technical posts + 4 comments) to stay active in LinkedIn Recruiter search algorithms with <15 mins/week.',
    arguments: [
      {
        name: 'targetRole',
        description: 'Target job title (e.g. "Senior Distributed Systems Engineer")',
        required: false,
      },
      {
        name: 'primaryTechStack',
        description: 'Comma-separated core technologies (e.g. "TypeScript, Node.js, PostgreSQL, Docker")',
        required: false,
      },
      {
        name: 'cadenceDays',
        description: 'Planning period in days (default: 30)',
        required: false,
      },
    ],
    handler: (args?: Record<string, string>): GetPromptResult => {
      const targetRole = args?.targetRole || 'Senior Software Engineer';
      const techStackStr = args?.primaryTechStack || 'TypeScript, Node.js, PostgreSQL, Docker';
      const techStack = techStackStr.split(',').map((s) => s.trim()).filter(Boolean);
      const cadenceDays = args?.cadenceDays ? parseInt(args.cadenceDays, 10) : 30;

      let instruction = `You are the CareerPulse Candidate Discovery Strategist.\nYour objective is to generate a low-friction 30-day passive visibility plan designed to keep the candidate active in LinkedIn Recruiter's algorithm with less than 15 minutes per week.\n\n`;
      instruction +=
        `Call the "generate_passive_visibility_plan" tool with:\n` +
        `- targetRole: "${targetRole}"\n` +
        `- primaryTechStack: ${JSON.stringify(techStack)}\n` +
        `- cadenceDays: ${cadenceDays}\n\n` +
        `Deliverables to present to the user:\n` +
        `1. **Recruiter Algorithm Context**: Explain how LinkedIn Recruiter's "Spotlight: Active in past 30 days" filter boosts search rankings by up to 4x.\n` +
        `2. **Execution Calendar**: Day-by-day table showing Day 1 profile refresh, Day 3 & 12 & 18 & 27 targeted comments, and Day 7 & 21 proof-of-work posts.\n` +
        `3. **Pre-drafted Copy-Paste Posts**: Full text for Post 1 (Architecture Decision) and Post 2 (Performance Benchmark).\n` +
        `4. **Anti-Cringe Commenting Blueprints**: Ready-to-use comments tailored for technical threads without sycophancy.`;

      return {
        description: '30-day passive candidate visibility plan instructions',
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: instruction,
            },
          },
        ],
      };
    },
  },
};

/**
 * Array of prompt schemas formatted for MCP ListPromptsRequestSchema response
 */
export const PROMPT_DEFINITIONS: Prompt[] = Object.values(PROMPT_REGISTRY).map((p) => ({
  name: p.name,
  description: p.description,
  arguments: p.arguments,
}));

/**
 * Registers ListPromptsRequestSchema and GetPromptRequestSchema on the MCP Server instance
 */
export function registerPromptHandlers(server: Server): void {
  server.setRequestHandler(ListPromptsRequestSchema, async () => {
    return {
      prompts: PROMPT_DEFINITIONS,
    };
  });

  server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    const promptDef = PROMPT_REGISTRY[name];
    if (!promptDef) {
      throw new McpError(ErrorCode.MethodNotFound, `Unknown prompt: ${name}`);
    }
    return await promptDef.handler(args);
  });
}
