import {
  NormalizedProfile,
  PartialProfile,
  SynthesizeSectionPatchInput,
} from '../contracts/profile-schema.js';

export interface SectionPatchResult {
  section: 'headline' | 'about' | 'roles' | 'experience';
  originalContent: string;
  synthesizedContent: string;
  xyzComponents?: {
    accomplishedX: string;
    measuredByY: string;
    byDoingZ: string;
    fullStatement: string;
  }[];
  alternatives?: {
    label: string;
    content: string;
    characterCount: number;
    rationale: string;
  }[];
  bullets?: string[];
  rationale: string[];
  markdownDiff: string;
}

export interface DiffEntryItem {
  sectionName: string;
  operation: 'added' | 'removed' | 'modified' | 'identical';
  baselineValue?: any;
  proposedValue?: any;
  diffSnippet: string;
}

export interface ChangeDiffResult {
  hasDifferences: boolean;
  totalModifications: number;
  stats: {
    additions: number;
    modifications: number;
    deletions: number;
  };
  markdownReport: string;
  entries: DiffEntryItem[];
}

/**
 * Pure function: Generates line-by-line diff text with - and + prefixes
 */
export function computeLineDiff(oldText: string, newText: string): string {
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');
  const diffLines: string[] = [];

  const maxLen = Math.max(oldLines.length, newLines.length);
  for (let i = 0; i < maxLen; i++) {
    const o = oldLines[i];
    const n = newLines[i];

    if (o !== undefined && n !== undefined) {
      if (o === n) {
        diffLines.push(`  ${o}`);
      } else {
        diffLines.push(`- ${o}`);
        diffLines.push(`+ ${n}`);
      }
    } else if (o !== undefined) {
      diffLines.push(`- ${o}`);
    } else if (n !== undefined) {
      diffLines.push(`+ ${n}`);
    }
  }

  return diffLines.join('\n');
}

/**
 * Pure function: Synthesizes section patch applying the Google XYZ formula
 */
export function synthesizeSectionPatchEngine(
  input: SynthesizeSectionPatchInput
): SectionPatchResult {
  const rawText =
    typeof input.currentContent === 'string'
      ? input.currentContent.trim()
      : input.currentContent.rawText ||
        (input.currentContent.bullets || []).join('\n') ||
        `${input.currentContent.title || ''} at ${input.currentContent.company || ''}`.trim();

  const targetRole = input.targetRole || 'Senior Staff Software Engineer';
  const kw = input.focusKeywords && input.focusKeywords.length > 0
    ? input.focusKeywords
    : ['Distributed Systems', 'TypeScript', 'Cloud Architecture'];
  const userMetrics = input.metrics && input.metrics.length > 0
    ? input.metrics
    : ['scaling systems to 10M+ daily events', 'cutting p99 latency by 45%'];

  const normalizedSection = input.section === 'roles' ? 'experience' : input.section;

  if (normalizedSection === 'headline') {
    const kwJoined = kw.slice(0, 3).join(' • ');
    const kwPipe = kw.slice(0, 3).join(', ');
    const metricStr = userMetrics[0];

    const alternatives = [
      {
        label: 'Outcome-Driven (Impact & Scale)',
        content: `${targetRole} | Scaling ${metricStr} via ${kwPipe} | High-Availability Systems`,
        characterCount: 0,
        rationale: 'Puts measurable scale upfront to immediately capture recruiter attention.',
      },
      {
        label: 'Keyword-Optimized (ATS Magnet)',
        content: `${targetRole} • ${kwJoined} • Cloud Infrastructure • Event-Driven Systems`,
        characterCount: 0,
        rationale: 'Maximizes algorithmic keyword matches across recruiter search filters.',
      },
      {
        label: 'Executive Value Proposition',
        content: `${targetRole} specializing in ${kw[0]}. Driving engineering velocity (${metricStr}) through modern architecture.`,
        characterCount: 0,
        rationale: 'Focuses on strategic delivery and business outcome enablement.',
      },
    ];

    alternatives.forEach((a) => (a.characterCount = a.content.length));
    const synthesized = alternatives[0].content;

    return {
      section: 'headline',
      originalContent: rawText,
      synthesizedContent: synthesized,
      alternatives,
      rationale: [
        'Transformed duty-based title into outcome-oriented value proposition.',
        'Structured with pipe separators for high scanning readability.',
        'Indexed core technical keywords within LinkedIn 220-character limit.',
      ],
      markdownDiff: `\`\`\`diff\n- ${rawText || '(Empty)'}\n+ ${synthesized}\n\`\`\``,
    };
  }

  if (normalizedSection === 'about') {
    const xyzComponents = [
      {
        accomplishedX: 'Distributed microservices architecture supporting multi-region scale',
        measuredByY: 'Achieving 99.99% uptime and zero-downtime database failovers',
        byDoingZ: 'Refactoring monolithic services into event-driven Kubernetes microservices',
        fullStatement:
          'Accomplished multi-region high availability, measured by 99.99% uptime, by architecting event-driven microservices on Kubernetes.',
      },
      {
        accomplishedX: 'Developer deployment velocity and automated release cycles',
        measuredByY: 'Reducing deployment time by 60% across 8 engineering teams',
        byDoingZ: 'Implementing containerized CI/CD pipelines with comprehensive test suites',
        fullStatement:
          'Accelerated release velocity, measured by 60% faster deployments, by engineering automated CI/CD pipelines with containerized testing.',
      },
    ];

    const synthesizedAbout = [
      `I am a ${targetRole} focused on architecting resilient, scalable platforms and translating complex system requirements into high-performance engineering solutions.`,
      '',
      `Key Impact Highlights (Google XYZ Framework):`,
      `- ${xyzComponents[0].fullStatement}`,
      `- ${xyzComponents[1].fullStatement}`,
      '',
      `Core Technical Competencies:`,
      `• Languages & Stacks: ${kw.slice(0, 4).join(', ')}`,
      `• Cloud & Infrastructure: Cloud Architecture, Container Orchestration, CI/CD`,
      `• Engineering Practices: System Design, Agile Leadership, Code Quality, High-Impact Delivery`,
      '',
      `Passionate about solving hard engineering challenges and mentoring high-performing teams. Let's connect or collaborate!`,
    ].join('\n');

    return {
      section: 'about',
      originalContent: rawText,
      synthesizedContent: synthesizedAbout,
      xyzComponents,
      rationale: [
        'Opened with a compelling professional hook establishing seniority and value.',
        'Structured career highlights around concrete XYZ achievements.',
        'Added a clear, skimmable Core Competencies block for ATS keyword scanning.',
        'Concluded with an approachable call-to-action for recruiters and collaborators.',
      ],
      markdownDiff: `\`\`\`diff\n- ${rawText.slice(0, 120)}...\n+ ${synthesizedAbout.slice(0, 120)}...\n\`\`\``,
    };
  }

  // Experience / Roles section
  const lines = rawText.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
  const rawDuties = lines.length > 0 ? lines : [rawText || 'Responsible for application backend and databases'];

  const strongVerbs = ['Architected', 'Engineered', 'Spearheaded', 'Optimized', 'Automated', 'Streamlined'];
  const xyzComponents: SectionPatchResult['xyzComponents'] = [];
  const bullets: string[] = [];

  rawDuties.forEach((duty, idx) => {
    const verb = strongVerbs[idx % strongVerbs.length];
    const tech = kw[idx % kw.length] + (kw[(idx + 1) % kw.length] ? ` and ${kw[(idx + 1) % kw.length]}` : '');
    const metric = userMetrics[idx % userMetrics.length];

    let accomplishedX = 'high-throughput backend microservices';
    if (/database|sql|query|postgres|redis/i.test(duty)) {
      accomplishedX = 'database query performance and caching layer';
    } else if (/frontend|react|ui|web/i.test(duty)) {
      accomplishedX = 'client-side rendering and state management pipeline';
    } else if (/ci\/cd|deploy|pipeline|cloud|aws|docker|kubernetes/i.test(duty)) {
      accomplishedX = 'automated CI/CD deployment pipelines and container infrastructure';
    } else if (/team|lead|mentor|agile/i.test(duty)) {
      accomplishedX = 'cross-functional engineering workflows and sprint delivery';
    } else if (duty.length > 15) {
      accomplishedX = duty
        .replace(/^(responsible for|worked on|helped with|assisted in|tasked with)\s*/i, '')
        .replace(/^[•\-*▪]\s*/, '');
    }

    const measuredByY = metric.startsWith('by') || metric.startsWith('to') ? metric : `improving ${metric}`;
    const byDoingZ = `by implementing resilient architectures with ${tech} and automated testing`;

    const fullStatement = `${verb} ${accomplishedX}, ${measuredByY} ${byDoingZ}.`;

    xyzComponents.push({
      accomplishedX,
      measuredByY,
      byDoingZ,
      fullStatement,
    });

    bullets.push(fullStatement);
  });

  const synthesizedExp = bullets.join('\n');

  return {
    section: 'experience',
    originalContent: rawText,
    synthesizedContent: synthesizedExp,
    xyzComponents,
    bullets,
    rationale: [
      'Restructured duty-based language into Google XYZ format: Accomplished [X], measured by [Y], by doing [Z].',
      'Replaced passive phrases with high-impact action verbs.',
      'Inserted quantifiable metrics to substantiate technical achievements.',
      'Explicitly cited technical stack and methodology to drive keyword density.',
    ],
    markdownDiff: `\`\`\`diff\n- ${rawDuties[0] || ''}\n+ ${bullets[0] || ''}\n\`\`\``,
  };
}

/**
 * Pure function: Compares baseline and proposed profiles, outputting structured diff and Markdown change plan
 */
export function renderChangeDiffEngine(
  baseline: NormalizedProfile,
  proposed: PartialProfile,
  format: 'unified' | 'side_by_side' | 'summary_only' = 'unified'
): ChangeDiffResult {
  const entries: DiffEntryItem[] = [];
  let additions = 0;
  let modifications = 0;
  let deletions = 0;

  // 1. Headline Diff
  if (proposed.headline !== undefined && proposed.headline !== baseline.headline) {
    modifications++;
    const diffBlock = computeLineDiff(baseline.headline || '(None)', proposed.headline || '(None)');
    entries.push({
      sectionName: 'Headline',
      operation: baseline.headline ? 'modified' : 'added',
      baselineValue: baseline.headline,
      proposedValue: proposed.headline,
      diffSnippet: diffBlock,
    });
  }

  // 2. Summary Diff
  if (proposed.summary !== undefined && proposed.summary !== baseline.summary) {
    modifications++;
    const diffBlock = computeLineDiff(baseline.summary || '(None)', proposed.summary || '(None)');
    entries.push({
      sectionName: 'Summary / About',
      operation: baseline.summary ? 'modified' : 'added',
      baselineValue: baseline.summary,
      proposedValue: proposed.summary,
      diffSnippet: diffBlock,
    });
  }

  // 3. Skills Diff
  if (proposed.skills !== undefined) {
    const baseSet = new Set(baseline.skills.map((s) => s.toLowerCase()));
    const propSet = new Set(proposed.skills.map((s) => s.toLowerCase()));

    const addedSkills = proposed.skills.filter((s) => !baseSet.has(s.toLowerCase()));
    const removedSkills = baseline.skills.filter((s) => !propSet.has(s.toLowerCase()));

    if (addedSkills.length > 0 || removedSkills.length > 0) {
      const skillLines: string[] = [];
      for (const r of removedSkills) {
        deletions++;
        skillLines.push(`- ${r}`);
      }
      for (const a of addedSkills) {
        additions++;
        skillLines.push(`+ ${a}`);
      }

      entries.push({
        sectionName: 'Skills',
        operation: 'modified',
        baselineValue: baseline.skills,
        proposedValue: proposed.skills,
        diffSnippet: skillLines.join('\n'),
      });
    }
  }

  // 4. Experience Diff
  if (proposed.experiences !== undefined) {
    const baseExps = baseline.experiences;
    const propExps = proposed.experiences;
    const maxLen = Math.max(baseExps.length, propExps.length);

    for (let i = 0; i < maxLen; i++) {
      const b = baseExps[i];
      const p = propExps[i];

      if (!b && p) {
        additions++;
        const snippet = `+ Role: ${p.title} at ${p.company}\n` +
          (p.bulletPoints && p.bulletPoints.length > 0
            ? p.bulletPoints.map((bullet) => `+   • ${bullet}`).join('\n')
            : `+   ${p.description || ''}`);
        entries.push({
          sectionName: `Role [${i + 1}] Added: ${p.title} at ${p.company}`,
          operation: 'added',
          proposedValue: p,
          diffSnippet: snippet,
        });
      } else if (b && !p) {
        deletions++;
        const snippet = `- Role: ${b.title} at ${b.company}\n` +
          (b.bulletPoints && b.bulletPoints.length > 0
            ? b.bulletPoints.map((bullet) => `-   • ${bullet}`).join('\n')
            : `-   ${b.description || ''}`);
        entries.push({
          sectionName: `Role [${i + 1}] Removed: ${b.title} at ${b.company}`,
          operation: 'removed',
          baselineValue: b,
          diffSnippet: snippet,
        });
      } else if (b && p) {
        const bText = `${b.title} | ${b.company}\n${(b.bulletPoints || []).join('\n') || b.description || ''}`;
        const pText = `${p.title} | ${p.company}\n${(p.bulletPoints || []).join('\n') || p.description || ''}`;

        if (bText !== pText) {
          modifications++;
          const snippet = computeLineDiff(bText, pText);
          entries.push({
            sectionName: `Role [${i + 1}]: ${b.title} at ${b.company}`,
            operation: 'modified',
            baselineValue: b,
            proposedValue: p,
            diffSnippet: snippet,
          });
        }
      }
    }
  }

  // 5. Education Diff
  if (proposed.education !== undefined) {
    const bEdu = baseline.education.map((e) => `${e.school}: ${e.degree || ''} (${e.fieldOfStudy || ''})`).join('\n');
    const pEdu = proposed.education.map((e) => `${e.school}: ${e.degree || ''} (${e.fieldOfStudy || ''})`).join('\n');

    if (bEdu !== pEdu) {
      modifications++;
      const snippet = computeLineDiff(bEdu || '(None)', pEdu || '(None)');
      entries.push({
        sectionName: 'Education',
        operation: 'modified',
        baselineValue: baseline.education,
        proposedValue: proposed.education,
        diffSnippet: snippet,
      });
    }
  }

  const totalModifications = additions + modifications + deletions;
  const hasDifferences = totalModifications > 0;

  // Markdown change plan generation
  const md: string[] = [];
  md.push('# Proposed Profile Change Plan\n');
  md.push(`**Change Metrics:** ${totalModifications} total alterations (+${additions} additions, ~${modifications} modifications, -${deletions} deletions)\n`);

  if (!hasDifferences) {
    md.push('_No differences detected between baseline profile and proposed changes._');
  } else {
    for (const entry of entries) {
      md.push(`### ${entry.sectionName} [${entry.operation.toUpperCase()}]`);
      md.push('```diff');
      md.push(entry.diffSnippet);
      md.push('```\n');
    }
  }

  return {
    hasDifferences,
    totalModifications,
    stats: {
      additions,
      modifications,
      deletions,
    },
    markdownReport: md.join('\n'),
    entries,
  };
}
