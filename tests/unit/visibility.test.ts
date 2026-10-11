import { describe, it, expect } from 'vitest';
import {
  humanizeEngineeringText,
  auditCliches,
} from '../../src/visibility/humanizer.js';
import { generateProofOfWorkPost } from '../../src/visibility/proof-of-work.js';
import { generatePassiveVisibilityPlan } from '../../src/visibility/passive-visibility.js';

describe('Visibility & Humanizer Module (Unit)', () => {
  describe('humanizer.ts', () => {
    it('detects and flags banned AI clichés', () => {
      const clicheText =
        'I am thrilled to announce that we delve into cutting-edge solutions. It is a testament to our team as we supercharge the platform.';
      const cliches = auditCliches(clicheText);

      expect(cliches.length).toBeGreaterThanOrEqual(4);
      const labels = cliches.map((c) => c.cliche);
      expect(labels).toContain('thrilled to announce/share');
      expect(labels).toContain('delve');
      expect(labels).toContain('testament');
      expect(labels).toContain('supercharge');
    });

    it('replaces clichés with authentic direct engineering prose and computes cliché score', () => {
      const text =
        'I am thrilled to announce we embarked on a transformative journey to delve into database performance. It stands as a testament to our ability to seamlessly supercharge systems in today\'s fast-paced world.';
      const result = humanizeEngineeringText(text);

      expect(result.clicheScore).toBeGreaterThan(50);
      expect(result.humanizedText).not.toContain('thrilled to announce');
      expect(result.humanizedText).not.toContain('delve into');
      expect(result.humanizedText).not.toContain('a testament to');
      expect(result.humanizedText).not.toContain('supercharge');
      expect(result.humanizedText).not.toContain('in today\'s fast-paced world');
      expect(result.improvementsApplied.length).toBeGreaterThan(3);
    });

    it('returns score 0 for clean engineering text without clichés', () => {
      const authenticText =
        'Reduced PostgreSQL query latency by 45% using composite indexes and connection pooling.';
      const result = humanizeEngineeringText(authenticText);

      expect(result.clicheScore).toBe(0);
      expect(result.detectedCliches).toHaveLength(0);
      expect(result.humanizedText).toBe(authenticText);
    });
  });

  describe('proof-of-work.ts', () => {
    it('generates high-credibility architecture_decision post with under 180 words', () => {
      const post = generateProofOfWorkPost({
        type: 'architecture_decision',
        technicalNotes: [
          'Replaced synchronous REST calls between microservices with Kafka event streams',
          'Enforced idempotent consumer handlers with Redis key locking',
          'Configured Dead Letter Queues for poisoned payloads',
        ],
        context: 'Handling 15k RPS payment webhooks under high concurrency',
        toolsAndTech: ['Kafka', 'Redis', 'Go', 'Docker'],
        metrics: ['p99 response latency reduced from 420ms to 35ms', '0 duplicate charge incidents'],
        githubUrl: 'https://github.com/example/payment-event-pipeline',
      });

      expect(post.postType).toBe('architecture_decision');
      expect(post.headlineHook).toContain('Technical architecture trade-off:');
      expect(post.technicalSolution).toContain('Kafka');
      expect(post.quantifiableImpact).toContain('p99 response latency reduced from 420ms to 35ms');
      expect(post.formattedMarkdownPost).toContain('https://github.com/example/payment-event-pipeline');
      expect(post.llmClicheScore).toBe(0);

      // Verify concise word count under 180 words
      const words = post.formattedMarkdownPost.split(/\s+/).filter(Boolean);
      expect(words.length).toBeLessThanOrEqual(180);
    });

    it('generates performance_optimization post with concrete metrics and tags', () => {
      const post = generateProofOfWorkPost({
        type: 'performance_optimization',
        technicalNotes: 'Optimized PostgreSQL slow queries by replacing subqueries with CTEs and adding partial indices.',
        context: 'High-volume user analytics reporting service',
        metrics: ['query time dropped by 82%', 'CPU usage reduced from 90% to 35%'],
      });

      expect(post.postType).toBe('performance_optimization');
      expect(post.headlineHook).toContain('Latency & performance benchmark:');
      expect(post.quantifiableImpact).toContain('82%');
      expect(post.recruiterKeywords).toContain('#performance');
    });

    it('handles arrays of raw technical notes cleanly', () => {
      const post = generateProofOfWorkPost({
        type: 'incident_postmortem',
        technicalNotes: [
          'Connection pool exhaustion led to 504 gateway timeouts',
          'Identified unclosed transactions during connection leaks',
          'Implemented automatic timeout interceptors and circuit breakers',
        ],
      });

      expect(post.postType).toBe('incident_postmortem');
      expect(post.headlineHook).toContain('Production postmortem');
      expect(post.technicalSolution).toContain('Connection pool exhaustion');
    });
  });

  describe('passive-visibility.ts', () => {
    it('builds a complete 30-day passive visibility plan with 2 posts and 4 targeted comments', () => {
      const plan = generatePassiveVisibilityPlan({
        targetRole: 'Staff Distributed Systems Engineer',
        primaryTechStack: ['Go', 'Kubernetes', 'gRPC', 'PostgreSQL'],
        currentProjects: ['Distributed consensus cluster', 'Multi-tenant rate limiter'],
        cadenceDays: 30,
      });

      expect(plan.targetRole).toBe('Staff Distributed Systems Engineer');
      expect(plan.cadenceDays).toBe(30);

      // Verify exactly 2 posts
      expect(plan.postDrafts).toHaveLength(2);
      expect(plan.postDrafts[0].postType).toBe('architecture_decision');
      expect(plan.postDrafts[1].postType).toBe('performance_optimization');

      // Verify 4 non-cringe comment blueprints
      expect(plan.commentingBlueprints).toHaveLength(4);
      for (const cb of plan.commentingBlueprints) {
        expect(cb.antiCringeGuideline).toBeDefined();
        expect(cb.templateExample).toBeDefined();
        expect(cb.templateExample.length).toBeGreaterThan(20);
      }

      // Verify timeline actions
      expect(plan.timeline.length).toBeGreaterThanOrEqual(6);
      const postActions = plan.timeline.filter((t) => t.actionType === 'post');
      const commentActions = plan.timeline.filter((t) => t.actionType === 'comment');
      expect(postActions).toHaveLength(2);
      expect(commentActions).toHaveLength(4);

      // Verify formatted markdown output
      expect(plan.formattedMarkdownPlan).toContain('# 30-Day Passive Visibility Plan');
      expect(plan.formattedMarkdownPlan).toContain('Recruiter Discovery Algorithm Insight');
      expect(plan.formattedMarkdownPlan).toContain('Post 1 (Publish on Day 7)');
      expect(plan.formattedMarkdownPlan).toContain('Post 2 (Publish on Day 21)');
    });
  });
});
