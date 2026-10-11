import {
  PassiveVisibilityPlan,
  PassiveVisibilityPlanInput,
  ProofOfWorkPost,
} from '../contracts/profile-schema.js';
import { generateProofOfWorkPost } from './proof-of-work.js';

/**
 * Pure function: Generates a minimal 30-day low-friction visibility plan
 * Designed for engineers who want recruiter visibility without daily posting or influencer content.
 */
export function generatePassiveVisibilityPlan(
  input?: PassiveVisibilityPlanInput
): PassiveVisibilityPlan {
  const targetRole = input?.targetRole || 'Senior Software Engineer';
  const techStack =
    input?.primaryTechStack && input.primaryTechStack.length > 0
      ? input.primaryTechStack
      : ['TypeScript', 'Node.js', 'PostgreSQL', 'Redis', 'Docker'];
  const projects =
    input?.currentProjects && input.currentProjects.length > 0
      ? input.currentProjects
      : [
          'Event-driven transaction processing system',
          'Database query optimization and connection pool tuning',
        ];
  const cadenceDays = input?.cadenceDays || 30;

  // 1. Generate 2 High-Signal Proof-of-Work Posts
  const post1: ProofOfWorkPost = generateProofOfWorkPost({
    type: 'architecture_decision',
    technicalNotes: [
      `Evaluated trade-offs between sync REST calls vs. asynchronous event streaming for ${projects[0]}`,
      `Chose ${techStack.slice(0, 2).join(' + ')} with idempotent consumers to prevent duplicated processing`,
      `Configured dead-letter queues and structured tracing across boundary services`,
    ],
    context: `Designing core pipeline for ${targetRole} level workload`,
    toolsAndTech: techStack.slice(0, 4),
    metrics: ['zero message loss across 5M daily events', 'cut downstream API timeout rate to 0.01%'],
    audience: 'technical_recruiter',
  });

  const post2: ProofOfWorkPost = generateProofOfWorkPost({
    type: 'performance_optimization',
    technicalNotes: [
      `Profiled database p99 query latency spikes on ${projects[1] || projects[0]}`,
      `Introduced multi-tier caching using ${techStack.includes('Redis') ? 'Redis' : techStack[0]} and composite indexing`,
      `Bounded query connection pools to eliminate connection starvation during peak traffic`,
    ],
    context: `Production throughput optimization under heavy read/write concurrency`,
    toolsAndTech: techStack.slice(0, 4),
    metrics: ['p99 query latency dropped from 380ms to 24ms', 'database CPU utilization decreased by 42%'],
    audience: 'technical_recruiter',
  });

  // 2. Curated Commenting Blueprints
  const commentingBlueprints = [
    {
      targetType: 'Staff/Principal Engineers discussing architecture trade-offs',
      commentAngle: 'Add production edge case or operational constraint',
      antiCringeGuideline: 'Never write "Great insights!". State the specific trade-off or failure mode directly.',
      templateExample:
        `"Interesting point on isolating reads from writes. In our ${techStack[0]} stack, we noticed that replica lag caused edge-case inconsistencies during sudden traffic spikes, so we had to enforce read-after-write consistency on user mutations."`,
    },
    {
      targetType: 'Engineering Leaders / CTOs discussing technical debt & refactoring',
      commentAngle: 'Quantify business impact and rollback safety',
      antiCringeGuideline: 'Avoid generic agreeableness. Share an actionable metric or deployment guardrail.',
      templateExample:
        `"Strongly agree on incremental migration over big-bang rewrites. Using feature flags and shadow traffic testing helped us verify zero regressions before cutting over 100% of production traffic."`,
    },
    {
      targetType: 'Open-Source Maintainers / Tech Authors highlighting database or distributed system nuances',
      commentAngle: 'Validate with production benchmarking numbers',
      antiCringeGuideline: 'Keep it to 2-3 concise sentences with concrete technology names.',
      templateExample:
        `"Ran into a similar connection pooling bottleneck with ${techStack[2] || 'PostgreSQL'} under high concurrent worker spikes. Setting conservative pool limits combined with circuit breakers made a noticeable difference in stability."`,
    },
    {
      targetType: 'SRE / Infrastructure leads breaking down postmortems and resiliency',
      commentAngle: 'Share observability or alerting heuristic',
      antiCringeGuideline: 'Speak engineer-to-engineer without performative praise.',
      templateExample:
        `"Good breakdown. We instituted a rule that every alert must link directly to a runbook and an actionable metric dashboard, which reduced on-call fatigue significantly."`,
    },
  ];

  // 3. 30-Day Timeline (7 minimal actions)
  const timeline = [
    {
      day: 1,
      week: 1,
      actionType: 'profile_refresh' as const,
      title: 'Profile Freshen-up & Keyword Alignment',
      description: 'Update LinkedIn headline and top 5 skills to match target role boolean search terms.',
      targetAudienceOrCreators: 'Recruiter Search Index',
      contentPromptOrDraft: `Headline: ${targetRole} | ${techStack.slice(0, 4).join(' • ')} | High-Throughput Distributed Systems`,
      estimatedMinutes: 10,
    },
    {
      day: 3,
      week: 1,
      actionType: 'comment' as const,
      title: 'Comment 1: Architecture Trade-off Insight',
      description: 'Leave one technical comment on a Staff Engineer post discussing system design.',
      targetAudienceOrCreators: commentingBlueprints[0].targetType,
      contentPromptOrDraft: commentingBlueprints[0].templateExample,
      estimatedMinutes: 5,
    },
    {
      day: 7,
      week: 1,
      actionType: 'post' as const,
      title: 'Post 1: Architecture Decision & Trade-offs',
      description: 'Publish Proof of Work #1 covering system decoupling and event streaming.',
      targetAudienceOrCreators: 'Technical Recruiters & Hiring Managers',
      contentPromptOrDraft: post1.formattedMarkdownPost,
      estimatedMinutes: 5,
    },
    {
      day: 12,
      week: 2,
      actionType: 'comment' as const,
      title: 'Comment 2: Refactoring Guardrails & Metrics',
      description: 'Leave one measured comment on an engineering leader post discussing technical debt.',
      targetAudienceOrCreators: commentingBlueprints[1].targetType,
      contentPromptOrDraft: commentingBlueprints[1].templateExample,
      estimatedMinutes: 5,
    },
    {
      day: 18,
      week: 3,
      actionType: 'comment' as const,
      title: 'Comment 3: Distributed Systems Bottleneck Observation',
      description: 'Leave one comment on a systems/infrastructure thread sharing benchmark context.',
      targetAudienceOrCreators: commentingBlueprints[2].targetType,
      contentPromptOrDraft: commentingBlueprints[2].templateExample,
      estimatedMinutes: 5,
    },
    {
      day: 21,
      week: 3,
      actionType: 'post' as const,
      title: 'Post 2: Performance Benchmark & Latency Reduction',
      description: 'Publish Proof of Work #2 covering p99 latency optimization and caching.',
      targetAudienceOrCreators: 'Technical Recruiters & Hiring Managers',
      contentPromptOrDraft: post2.formattedMarkdownPost,
      estimatedMinutes: 5,
    },
    {
      day: 27,
      week: 4,
      actionType: 'comment' as const,
      title: 'Comment 4: Observability & Resilience Takeaway',
      description: 'Leave one comment on a postmortem or SRE post sharing production telemetry rules.',
      targetAudienceOrCreators: commentingBlueprints[3].targetType,
      contentPromptOrDraft: commentingBlueprints[3].templateExample,
      estimatedMinutes: 5,
    },
  ];

  // 4. Formatted Markdown Plan
  const markdownReport = [
    `# 30-Day Passive Visibility Plan: ${targetRole}`,
    '',
    `> **Guiding Principle**: Maximize recruiter reach with zero social media addiction. Total investment: **<15 minutes/week** across ${cadenceDays} days.`,
    '',
    '## Recruiter Discovery Algorithm Insight',
    '- **Active Talent Filter**: LinkedIn Recruiter features a toggle: *"Spotlights: More likely to respond / Engaged with LinkedIn"*. Candidates active in the last 30 days receive up to **4x higher visibility** in recruiter candidate pools.',
    '- **Signal vs. Noise**: Daily posting triggers algorithmic fatigue and attracts irrelevant commenters. Two high-signal technical posts + four authentic comments keep your candidate profile flagged as active without social media burnout.',
    '',
    '## 30-Day Execution Calendar',
    '| Day | Week | Action | Description | Est. Time |',
    '| :--- | :--- | :--- | :--- | :--- |',
    ...timeline.map(
      (t) => `| Day ${t.day} | Week ${t.week} | **${t.title}** | ${t.description} | ${t.estimatedMinutes} mins |`
    ),
    '',
    '---',
    '',
    '## Pre-drafted Proof-of-Work Posts',
    '',
    '### Post 1 (Publish on Day 7)',
    '```markdown',
    post1.formattedMarkdownPost,
    '```',
    '',
    '### Post 2 (Publish on Day 21)',
    '```markdown',
    post2.formattedMarkdownPost,
    '```',
    '',
    '---',
    '',
    '## Non-Cringe Commenting Guidelines',
    ...commentingBlueprints.map(
      (cb, idx) =>
        `### Comment Strategy ${idx + 1}: ${cb.targetType}\n- **Angle**: ${cb.commentAngle}\n- **Anti-cringe rule**: ${cb.antiCringeGuideline}\n- **Example Draft**:\n  > ${cb.templateExample}\n`
    ),
  ].join('\n');

  return {
    targetRole,
    cadenceDays,
    recruiterDiscoveryStrategy: {
      activeCandidateFilterBoost: 'Up to 4x higher ranking under LinkedIn Recruiter "Engaged / Active in past 30 days" spotlight filter',
      minTimeCommitmentMinutesPerWeek: 12,
      algorithmInsight: 'Recruiter discovery algorithms prioritize candidates with recent relevant activity. 2 technical posts and 4 targeted comments satisfy the activity criteria without requiring continuous engagement.',
    },
    timeline,
    postDrafts: [post1, post2],
    commentingBlueprints,
    formattedMarkdownPlan: markdownReport,
  };
}
