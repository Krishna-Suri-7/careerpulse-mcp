import {
  ProofOfWorkInput,
  ProofOfWorkPost,
  ProofOfWorkType,
} from '../contracts/profile-schema.js';
import { humanizeEngineeringText, auditCliches } from './humanizer.js';

interface TemplateStructure {
  hookPrefix: string;
  contextHeader: string;
  solutionHeader: string;
  outcomeHeader: string;
  takeawayHeader: string;
  defaultTags: string[];
}

const POST_TEMPLATES: Record<ProofOfWorkType, TemplateStructure> = {
  architecture_decision: {
    hookPrefix: 'Technical architecture trade-off:',
    contextHeader: 'The Constraint:',
    solutionHeader: 'The Decision & Trade-offs:',
    outcomeHeader: 'The Outcome:',
    takeawayHeader: 'Engineering Rule of Thumb:',
    defaultTags: ['#systemdesign', '#architecture', '#backend', '#scalability', '#engineering'],
  },
  performance_optimization: {
    hookPrefix: 'Latency & performance benchmark:',
    contextHeader: 'The Bottleneck:',
    solutionHeader: 'The Optimization:',
    outcomeHeader: 'Benchmark Results:',
    takeawayHeader: 'Key Heuristic:',
    defaultTags: ['#performance', '#latency', '#distributedSystems', '#softwareEngineering', '#benchmarking'],
  },
  incident_postmortem: {
    hookPrefix: 'Production postmortem and hardening breakdown:',
    contextHeader: 'What Failed in Production:',
    solutionHeader: 'Root Cause & Fix:',
    outcomeHeader: 'Hardening & Prevention:',
    takeawayHeader: 'Postmortem Takeaway:',
    defaultTags: ['#sre', '#devops', '#reliability', '#postmortem', '#cloud'],
  },
  system_migration: {
    hookPrefix: 'Zero-downtime migration architecture:',
    contextHeader: 'Legacy Limitations:',
    solutionHeader: 'Migration Strategy:',
    outcomeHeader: 'Verification & Cutover:',
    takeawayHeader: 'Migration Principle:',
    defaultTags: ['#infrastructure', '#database', '#cloudArchitecture', '#kubernetes', '#ci_cd'],
  },
  build_in_public: {
    hookPrefix: 'Engineering milestone breakdown:',
    contextHeader: 'The Problem to Solve:',
    solutionHeader: 'What I Built:',
    outcomeHeader: 'Early Metrics:',
    takeawayHeader: 'Lesson Learned:',
    defaultTags: ['#buildingInPublic', '#fullstack', '#typescript', '#webdev', '#softwareEngineering'],
  },
  deep_dive: {
    hookPrefix: 'Deep dive into internals:',
    contextHeader: 'The Problem Under the Hood:',
    solutionHeader: 'How It Works Internally:',
    outcomeHeader: 'Practical Application:',
    takeawayHeader: 'Takeaway for Engineers:',
    defaultTags: ['#deepdive', '#internals', '#backend', '#algorithms', '#techLeadership'],
  },
};

/**
 * Normalizes input notes into a flat list of technical statements
 */
function extractNotes(input: ProofOfWorkInput['technicalNotes']): string[] {
  if (Array.isArray(input)) {
    return input.map((s) => s.trim()).filter((s) => s.length > 0);
  }
  return input
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .map((l) => l.replace(/^[•\-*▪]\s*/, ''));
}

/**
 * Pure function: Translates technical notes into short, high-credibility recruiter-facing proof-of-work LinkedIn posts
 */
export function generateProofOfWorkPost(input: ProofOfWorkInput): ProofOfWorkPost {
  const type: ProofOfWorkType = input.type || 'architecture_decision';
  const notes = extractNotes(input.technicalNotes);
  const template = POST_TEMPLATES[type] || POST_TEMPLATES.architecture_decision;

  const techStack = input.toolsAndTech && input.toolsAndTech.length > 0
    ? input.toolsAndTech
    : ['Redis', 'Distributed Systems', 'PostgreSQL', 'Docker'];

  const metrics = input.metrics && input.metrics.length > 0
    ? input.metrics
    : ['reduced p99 latency by 45%', 'supported 10M+ daily events with zero downtime'];

  // 1. Construct headline hook based on core note
  const primaryNote = notes[0] || 'Refactored backend architecture to handle high throughput';
  const headlineHook = `${template.hookPrefix} How we handled ${primaryNote.toLowerCase().replace(/^(built|refactored|migrated|optimized)\s+/, '')}.`;

  // 2. Problem context
  const problemContext = input.context
    ? input.context.trim()
    : `In production, our previous design began bottlenecking under peak traffic. Specifically: ${notes[0] || 'Database CPU and latency spikes required architectural intervention.'}`;

  // 3. Technical solution / proof of work
  const solutionBullets = notes.length > 0
    ? notes.map((n) => `• ${n}`)
    : [
        `• Evaluated trade-offs and deployed ${techStack.slice(0, 3).join(', ')} to isolate hot paths.`,
        `• Decoupled synchronous request handling using event-driven async workers.`,
      ];
  const technicalSolution = solutionBullets.join('\n');

  // 4. Quantifiable impact
  const quantifiableImpact = metrics.map((m) => `✓ ${m}`).join('\n');

  // 5. Engineering takeaway
  const engineeringTakeaway = `When scaling ${techStack[0] || 'core systems'}, prioritize simple observability and bounded query complexity over premature abstraction.`;

  // 6. Recruiter Keywords & Tags
  const recruiterKeywords = Array.from(
    new Set([
      ...template.defaultTags,
      ...techStack.map((t) => `#${t.replace(/[^a-zA-Z0-9]/g, '')}`),
    ])
  );

  // Combine into markdown post
  const rawPostContent = [
    headlineHook,
    '',
    problemContext,
    '',
    `${template.solutionHeader}`,
    technicalSolution,
    '',
    `${template.outcomeHeader}`,
    quantifiableImpact,
    '',
    `${template.takeawayHeader}`,
    engineeringTakeaway,
    input.githubUrl ? `\nRepo / Teardown: ${input.githubUrl}` : '',
    '',
    recruiterKeywords.slice(0, 6).join(' '),
  ].filter((line) => line !== '').join('\n');

  // Run through humanizer to ensure zero LLM cliches
  const humanized = humanizeEngineeringText(rawPostContent);
  const bannedAvoided = auditCliches(rawPostContent).map((c) => c.cliche);

  return {
    postType: type,
    headlineHook,
    problemContext,
    technicalSolution,
    quantifiableImpact,
    engineeringTakeaway,
    recruiterKeywords,
    formattedMarkdownPost: humanized.humanizedText,
    llmClicheScore: humanized.clicheScore,
    bannedClichesAvoided: bannedAvoided,
  };
}

export { generatePassiveVisibilityPlan } from './passive-visibility.js';

