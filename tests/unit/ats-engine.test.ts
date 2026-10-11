import { describe, it, expect } from 'vitest';
import {
  extractQuantifiableMetrics,
  auditBullet,
  evaluateReadability,
  evaluateProfileAts,
  STRONG_ACTION_VERBS,
  WEAK_STARTERS,
} from '../../src/analytics/ats-engine.js';
import { NormalizedProfile } from '../../src/contracts/profile-schema.js';

describe('ATS Engine (Unit)', () => {
  describe('extractQuantifiableMetrics', () => {
    it('detects percentages, currency, multipliers, scale, and velocity', () => {
      const text =
        'Reduced p99 latency by 45%, saving $1.2M annually across 5M daily active users with 10x throughput and 500 req/s.';
      const metrics = extractQuantifiableMetrics(text);

      expect(metrics).toContain('45%');
      expect(metrics).toContain('$1.2M');
      expect(metrics).toContain('10x');
      expect(metrics.some((m) => m.includes('5M'))).toBe(true);
      expect(metrics.some((m) => m.includes('req/s'))).toBe(true);
    });

    it('returns empty array when text lacks metrics', () => {
      expect(extractQuantifiableMetrics('Worked on database queries and bug fixes.')).toEqual([]);
    });

    it('detects Euro and Pound currencies', () => {
      const text = 'Delivered €200k in savings and managed £500k budget.';
      const metrics = extractQuantifiableMetrics(text);
      expect(metrics).toContain('€200k');
      expect(metrics).toContain('£500k');
    });

    it('detects headcounts and team scale metrics', () => {
      const text = 'Managed 8 engineers and grew team to 15 direct reports.';
      const metrics = extractQuantifiableMetrics(text);
      expect(metrics.some((m) => m.toLowerCase().includes('managed 8') || m.toLowerCase().includes('15 direct reports'))).toBe(true);
    });
  });

  describe('auditBullet', () => {
    it('rates a full Google XYZ compliant bullet as 100 with no negative feedback', () => {
      const bullet =
        'Architected real-time payments platform, improving throughput by 300% by deploying Redis caching and Go microservices.';
      const result = auditBullet(bullet);

      expect(result.hasActionVerb).toBe(true);
      expect(result.detectedActionVerb).toBe('architected');
      expect(result.hasMetrics).toBe(true);
      expect(result.isXYZCompliant).toBe(true);
      expect(result.isWeakStarter).toBe(false);
      expect(result.score).toBe(100);
      expect(result.feedback).toHaveLength(0);
    });

    it('flags weak starters and deducts score', () => {
      const bullet = 'Responsible for maintaining server infrastructure and solving customer tickets.';
      const result = auditBullet(bullet);

      expect(result.isWeakStarter).toBe(true);
      expect(result.detectedWeakStarter).toBe('responsible for');
      expect(result.hasActionVerb).toBe(false);
      expect(result.hasMetrics).toBe(false);
      expect(result.isXYZCompliant).toBe(false);
      expect(result.score).toBeLessThanOrEqual(50);
      expect(result.feedback.some((f) => f.includes('Replace weak duty starter'))).toBe(true);
    });

    it('flags action verb bullet missing metrics and method connector', () => {
      const bullet = 'Engineered client interface and components.';
      const result = auditBullet(bullet);

      expect(result.hasActionVerb).toBe(true);
      expect(result.hasMetrics).toBe(false);
      expect(result.isXYZCompliant).toBe(false);
      expect(result.feedback.some((f) => f.includes('Quantify impact'))).toBe(true);
    });

    it('flags bullet with metrics but missing XYZ method connector', () => {
      const bullet = 'Accelerated database indexing, reducing latency by 40%.';
      const result = auditBullet(bullet);

      expect(result.hasActionVerb).toBe(true);
      expect(result.hasMetrics).toBe(true);
      expect(result.isXYZCompliant).toBe(false);
      expect(result.feedback.some((f) => f.includes('by doing [Z]'))).toBe(true);
    });
  });

  describe('evaluateReadability', () => {
    it('penalizes excessive emoji, all caps, and oversized bullet points', () => {
      const profile: NormalizedProfile = {
        fullName: 'Test User',
        headline: '🚀🔥 TOP SENIOR DEVELOPER EXPERT 🚀🔥',
        summary: 'URGENT NOTICE: I AM LOOKING FOR NEW JOBS NOW PLEASE HIRE ME QUICKLY.',
        experiences: [
          {
            title: 'Engineer',
            company: 'Tech',
            bulletPoints: [
              'This is an exceptionally long bullet point that continues rambling on and on with way too many words and phrases without adding any concrete value or structure and just filling up unnecessary space across more than forty-five words in total which hurts standard applicant tracking readability.',
            ],
          },
        ],
        skills: ['Java'],
        education: [],
        certifications: [],
        contactInfo: { websites: [] },
      };

      const result = evaluateReadability(profile);
      expect(result.score).toBeLessThan(90);
      expect(result.notes.some((n) => n.includes('ALL-CAPS') || n.includes('45 words'))).toBe(true);
    });

    it('awards high score for clean professional formatting', () => {
      const profile: NormalizedProfile = {
        fullName: 'Jane Doe',
        headline: 'Staff Software Engineer | Distributed Systems',
        summary: 'Experienced distributed systems engineer.',
        experiences: [
          {
            title: 'Staff Engineer',
            company: 'Stripe',
            bulletPoints: ['Architected low-latency ledger service processing 50k TPS.'],
          },
        ],
        skills: ['Go', 'Kubernetes'],
        education: [],
        certifications: [],
        contactInfo: { websites: [] },
      };

      const result = evaluateReadability(profile);
      expect(result.score).toBeGreaterThanOrEqual(90);
    });
  });

  describe('evaluateProfileAts (End-to-End Multi-Factor Scoring)', () => {
    it('scores a robust, optimized profile in the exceptional range (>80)', () => {
      const strongProfile: NormalizedProfile = {
        fullName: 'Elena Rostova',
        headline: 'Staff Distributed Systems Engineer | High Concurrency | Go, Kubernetes, AWS',
        summary:
          'Passionate systems architect with 10+ years scaling mission-critical cloud infrastructure. Proven history of optimizing low-latency architectures, mentoring senior engineers, and leading multi-region deployments. Contact me at elena@example.com for collaboration.',
        experiences: [
          {
            title: 'Staff Systems Engineer',
            company: 'Datadog',
            startDate: '2021',
            endDate: 'Present',
            isCurrent: true,
            bulletPoints: [
              'Architected distributed metric ingestion pipeline handling 10M events/sec, reducing latency by 45% by deploying Go microservices.',
              'Spearheaded automated chaos engineering framework, increasing cluster resilience to 99.99% uptime across 12 regions.',
              'Mentored 6 senior engineers and led weekly architecture design reviews.',
            ],
          },
          {
            title: 'Senior Backend Engineer',
            company: 'Uber',
            startDate: '2018',
            endDate: '2021',
            bulletPoints: [
              'Optimized geospatial indexing service, slashing memory footprint by 35% across 200 nodes.',
              'Automated CI/CD deployment pipelines, accelerating developer release velocity by 3x.',
            ],
          },
        ],
        skills: [
          'Go', 'Kubernetes', 'AWS', 'Distributed Systems', 'PostgreSQL',
          'Docker', 'Kafka', 'Terraform', 'System Design', 'CI/CD',
        ],
        education: [
          {
            school: 'University of Washington',
            degree: 'Bachelor of Science',
            fieldOfStudy: 'Computer Science',
          },
        ],
        certifications: [],
        contactInfo: {
          fullName: 'Elena Rostova',
          email: 'elena@example.com',
          location: 'Seattle, WA',
          websites: [],
        },
      };

      const result = evaluateProfileAts(strongProfile);

      expect(result.compositeScore).toBeGreaterThanOrEqual(80);
      expect(result.factors.impactMetrics.score).toBeGreaterThanOrEqual(70);
      expect(result.factors.verbStrength.score).toBeGreaterThanOrEqual(70);
      expect(result.factors.sectionCompleteness.score).toBeGreaterThanOrEqual(80);
      expect(result.strengths.length).toBeGreaterThan(0);
      expect(result.bulletAudits.length).toBe(2);
    });

    it('scores an empty/underdeveloped profile in the critical range (<40) and lists critical remediations', () => {
      const emptyProfile: NormalizedProfile = {
        fullName: '',
        headline: '',
        summary: '',
        experiences: [],
        skills: [],
        education: [],
        certifications: [],
        contactInfo: { websites: [] },
      };

      const result = evaluateProfileAts(emptyProfile);

      expect(result.compositeScore).toBeLessThan(40);
      expect(result.criticalRemediations.length).toBeGreaterThanOrEqual(3);
      expect(result.criticalRemediations.some((c) => c.includes('Headline is completely missing'))).toBe(true);
      expect(result.criticalRemediations.some((c) => c.includes('About section is empty'))).toBe(true);
    });

    it('correctly audits edge cases: short headline, brief summary, few skills', () => {
      const edgeProfile: NormalizedProfile = {
        fullName: 'Alex',
        headline: 'Coder',
        summary: 'I code.',
        experiences: [
          {
            title: 'Junior Developer',
            company: 'Startup',
            bulletPoints: [
              'Responsible for helping with website.',
              'Worked on various small tasks.',
            ],
          },
        ],
        skills: ['JS', 'HTML'],
        education: [],
        certifications: [],
        contactInfo: { websites: [] },
      };

      const result = evaluateProfileAts(edgeProfile);

      expect(result.sectionBreakdown.headline.status).toBe('Needs Optimization');
      expect(result.sectionBreakdown.summary.status).toBe('Needs Optimization');
      expect(result.factors.impactMetrics.score).toBe(0);
      expect(result.factors.verbStrength.score).toBe(0);
      expect(result.actionablePlan.length).toBeGreaterThan(0);
    });
  });
});
