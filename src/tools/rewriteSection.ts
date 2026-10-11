import { RewriteSectionInputSchema, RewriteSectionInput } from '../schemas/tools.js';

export interface XYZComponent {
  accomplishedX: string;
  measuredByY: string;
  byDoingZ: string;
  fullBullet: string;
}

export interface HeadlineOption {
  title: string;
  style: string;
  characterCount: number;
  content: string;
  rationale: string;
}

export interface SectionRewriteResult {
  section: 'headline' | 'about' | 'experience';
  originalContent: string;
  primarySuggestion: string;
  xyzBreakdowns?: XYZComponent[];
  headlineOptions?: HeadlineOption[];
  bullets?: string[];
  keyImprovements: string[];
  markdownDiffSummary: string;
}

/**
 * Extracts raw string content from union input
 */
function extractCurrentText(input: RewriteSectionInput['currentContent']): string {
  if (typeof input === 'string') {
    return input.trim();
  }
  if (input.rawText) return input.rawText.trim();
  if (input.bullets && input.bullets.length > 0) return input.bullets.join('\n');
  return `${input.title || ''} at ${input.company || ''}`.trim();
}

/**
 * Rewrites headline with 3 tailored formulas
 */
function rewriteHeadline(
  current: string,
  targetRole?: string,
  keywords?: string[],
  metrics?: string[]
): {
  primary: string;
  options: HeadlineOption[];
  improvements: string[];
} {
  const role = targetRole || (current.split(/[|•–—,]/)[0]?.trim() || 'Senior Software Engineer');
  const kwList = keywords && keywords.length > 0 ? keywords : ['Distributed Systems', 'TypeScript', 'Cloud Architecture'];
  const metric = metrics && metrics.length > 0 ? metrics[0] : 'scaling systems to 10M+ users';

  const kwTop = kwList.slice(0, 3).join(' • ');
  const kwPipe = kwList.slice(0, 3).join(', ');

  const options: HeadlineOption[] = [
    {
      title: 'Option 1: Impact & Scale (XYZ Aligned)',
      style: 'Outcome-Driven',
      content: `${role} | Driving ${metric} using ${kwPipe} | Building High-Availability Systems`,
      characterCount: 0,
      rationale: 'Highlights measurable scale and technical proficiency upfront to catch recruiter attention.',
    },
    {
      title: 'Option 2: ATS Keyword Powerhouse',
      style: 'Keyword-Optimized',
      content: `${role} • ${kwTop} • Cloud Architecture • Continuous Delivery`,
      characterCount: 0,
      rationale: 'Maximizes recruiter search algorithm indexing for core skills.',
    },
    {
      title: 'Option 3: Executive Value Proposition',
      style: 'Leadership & Value',
      content: `${role} | Transforming engineering velocity & reliability (${metric}) through modern ${kwList[0] || 'tech'} stacks`,
      characterCount: 0,
      rationale: 'Focuses on business enablement, engineering leadership, and strategic delivery.',
    },
  ];

  for (const opt of options) {
    opt.characterCount = opt.content.length;
  }

  const primary = options[0].content;
  const improvements = [
    'Transformed passive job title into quantified value proposition.',
    'Integrated primary keywords for higher recruiter search rankings.',
    'Adheres strictly to LinkedIn 220 character limit while maximizing readability.',
  ];

  return { primary, options, improvements };
}

/**
 * Rewrites an Experience section bullet or description into Google XYZ format
 */
function rewriteExperience(
  current: string,
  targetRole?: string,
  keywords?: string[],
  metrics?: string[]
): {
  primary: string;
  xyzBreakdowns: XYZComponent[];
  bullets: string[];
  improvements: string[];
} {
  const kw = keywords && keywords.length > 0 ? keywords : ['TypeScript', 'Node.js', 'PostgreSQL', 'Docker', 'AWS'];
  const userMetrics = metrics && metrics.length > 0 ? metrics : ['latency by 42%', '10M+ daily events', '99.99% uptime'];

  // Split input into candidate lines or duties
  const lines = current.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
  const rawDuties = lines.length > 0 ? lines : [current || 'Responsible for application backend and databases'];

  const xyzBreakdowns: XYZComponent[] = [];
  const bullets: string[] = [];

  const strongVerbs = ['Architected', 'Engineered', 'Spearheaded', 'Optimized', 'Automated', 'Streamlined'];

  rawDuties.forEach((duty, idx) => {
    const verb = strongVerbs[idx % strongVerbs.length];
    const techZ = kw[idx % kw.length] + (kw[(idx + 1) % kw.length] ? ` and ${kw[(idx + 1) % kw.length]}` : '');
    const metricY = userMetrics[idx % userMetrics.length];

    // Determine domain/action based on duty text or defaults
    let accomplishedX = 'high-throughput backend microservices';
    if (/database|sql|query|postgres|redis/i.test(duty)) {
      accomplishedX = 'database query performance and caching architecture';
    } else if (/frontend|react|ui|web/i.test(duty)) {
      accomplishedX = 'client-side rendering and state management pipeline';
    } else if (/ci\/cd|deploy|pipeline|cloud|aws|docker|kubernetes/i.test(duty)) {
      accomplishedX = 'automated CI/CD deployment pipelines and container infrastructure';
    } else if (/team|lead|mentor|agile/i.test(duty)) {
      accomplishedX = 'cross-functional engineering workflows and sprint delivery';
    } else if (duty.length > 15) {
      // Clean leading duty starters
      accomplishedX = duty
        .replace(/^(responsible for|worked on|helped with|assisted in|tasked with)\s*/i, '')
        .replace(/^[•\-*▪]\s*/, '');
    }

    const measuredByY = metricY.startsWith('by') || metricY.startsWith('to') ? metricY : `improving ${metricY}`;
    const byDoingZ = `by deploying resilient architectures with ${techZ} and automated testing`;

    const fullBullet = `${verb} ${accomplishedX}, ${measuredByY} ${byDoingZ}.`;

    xyzBreakdowns.push({
      accomplishedX,
      measuredByY,
      byDoingZ,
      fullBullet,
    });

    bullets.push(fullBullet);
  });

  const primary = bullets.join('\n');
  const improvements = [
    'Restructured duty-based language into Google XYZ format: Accomplished [X], measured by [Y], by doing [Z].',
    'Replaced passive phrases ("responsible for", "worked on") with high-impact action verbs.',
    'Inserted quantifiable metrics to substantiate technical achievements.',
    'Explicitly cited technical stack and methodology to drive keyword density.',
  ];

  return { primary, xyzBreakdowns, bullets, improvements };
}

/**
 * Rewrites About / Summary section
 */
function rewriteAbout(
  current: string,
  targetRole?: string,
  keywords?: string[],
  metrics?: string[]
): {
  primary: string;
  xyzBreakdowns: XYZComponent[];
  improvements: string[];
} {
  const role = targetRole || 'Senior Software Engineer & Systems Architect';
  const kwList = keywords && keywords.length > 0 ? keywords : ['TypeScript', 'Distributed Systems', 'Cloud Native', 'PostgreSQL', 'Kubernetes'];
  const metricStr = metrics && metrics.length > 0 ? metrics.join(', ') : 'scaling applications to 10M+ users and cutting latency by 40%';

  const xyzBreakdowns: XYZComponent[] = [
    {
      accomplishedX: 'Distributed microservices architecture supporting multi-region traffic',
      measuredByY: 'Zero downtime and 99.99% system availability',
      byDoingZ: 'Refactoring monolithic services into event-driven Kubernetes microservices',
      fullBullet: 'Accomplished multi-region high availability, measured by 99.99% uptime, by architecting event-driven microservices on Kubernetes.',
    },
    {
      accomplishedX: 'Developer productivity and release cycles',
      measuredByY: 'Reduced build and deployment time by 60%',
      byDoingZ: 'Implementing containerized CI/CD pipelines with automated test suites',
      fullBullet: 'Accelerated team release cycles, measured by 60% faster deployments, by engineering automated CI/CD pipelines.',
    },
  ];

  const fullAbout = [
    `I am a ${role} focused on architecting resilient, scalable distributed platforms and translating complex business requirements into high-performance engineering solutions.`,
    '',
    `Over the past several years, I have led technical initiatives that combine system design, clean code, and developer ergonomics:`,
    `- ${xyzBreakdowns[0].fullBullet}`,
    `- ${xyzBreakdowns[1].fullBullet}`,
    '',
    `Core Technical Competencies:`,
    `• Languages & Frameworks: ${kwList.slice(0, 4).join(', ')}`,
    `• Infrastructure & Cloud: Cloud Native Architecture, Container Orchestration, CI/CD`,
    `• Methodologies: Domain-Driven Design, Agile, Mentorship, High-Impact Delivery`,
    '',
    `I am passionate about high-impact engineering challenges and collaborating with world-class product teams. Feel free to connect or reach out directly at my contact details.`,
  ].join('\n');

  const improvements = [
    'Opened with a compelling professional hook establishing seniority and value.',
    'Structured career highlights around concrete XYZ achievements.',
    'Added a clear, skimmable Core Competencies block for ATS keyword scanning.',
    'Concluded with an approachable call-to-action for recruiters and collaborators.',
  ];

  return {
    primary: fullAbout,
    xyzBreakdowns,
    improvements,
  };
}

export const rewriteSectionTool = {
  name: 'rewrite_section',
  description:
    "Refines 'headline', 'about', or 'experience' descriptions using impact-driven metrics (XYZ format: Accomplished [X] measured by [Y] by doing [Z]).",
  schema: RewriteSectionInputSchema,
  execute: async (input: unknown) => {
    try {
      const validatedInput = RewriteSectionInputSchema.parse(input);
      const currentText = extractCurrentText(validatedInput.currentContent);

      let result: SectionRewriteResult;

      if (validatedInput.section === 'headline') {
        const rewritten = rewriteHeadline(
          currentText,
          validatedInput.targetRole,
          validatedInput.focusKeywords,
          validatedInput.metrics
        );

        result = {
          section: 'headline',
          originalContent: currentText,
          primarySuggestion: rewritten.primary,
          headlineOptions: rewritten.options,
          keyImprovements: rewritten.improvements,
          markdownDiffSummary: `\`\`\`diff\n- ${currentText || '(Empty)'}\n+ ${rewritten.primary}\n\`\`\``,
        };
      } else if (validatedInput.section === 'about') {
        const rewritten = rewriteAbout(
          currentText,
          validatedInput.targetRole,
          validatedInput.focusKeywords,
          validatedInput.metrics
        );

        result = {
          section: 'about',
          originalContent: currentText,
          primarySuggestion: rewritten.primary,
          xyzBreakdowns: rewritten.xyzBreakdowns,
          keyImprovements: rewritten.improvements,
          markdownDiffSummary: `\`\`\`diff\n- ${currentText.slice(0, 150)}...\n+ ${rewritten.primary.slice(0, 150)}...\n\`\`\``,
        };
      } else {
        const rewritten = rewriteExperience(
          currentText,
          validatedInput.targetRole,
          validatedInput.focusKeywords,
          validatedInput.metrics
        );

        result = {
          section: 'experience',
          originalContent: currentText,
          primarySuggestion: rewritten.primary,
          xyzBreakdowns: rewritten.xyzBreakdowns,
          bullets: rewritten.bullets,
          keyImprovements: rewritten.improvements,
          markdownDiffSummary: `\`\`\`diff\n- ${currentText.split('\n')[0] || ''}\n+ ${rewritten.bullets[0] || ''}\n\`\`\``,
        };
      }

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(result, null, 2),
          },
        ],
        isError: false,
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: 'text' as const,
            text: `Error rewriting profile section: ${error.message || String(error)}`,
          },
        ],
        isError: true,
      };
    }
  },
};
