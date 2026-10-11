import { describe, it, expect } from 'vitest';
import {
  extractQuantifiableMetrics,
  isBulletQuantified,
  auditBullet,
  evaluateQuantifiedImpact,
  evaluateSkillIntegration,
  evaluateVerbStrength,
  evaluateStructuralParseability,
  evaluateRecruiterTargeting,
  evaluateReadability,
  evaluateProfileAts,
  STRONG_ACTION_VERBS,
  NEUTRAL_ACTION_VERBS,
  WEAK_STARTERS,
} from '../../src/analytics/ats-engine.js';
import { NormalizedProfile } from '../../src/contracts/profile-schema.js';

describe('ATS Engine - Modern 5-Pillar Scoring Model', () => {
  // ==========================================================================
  // Pillar 1: Quantified Impact & Scale (30 Points Max)
  // ==========================================================================
  describe('Pillar 1: Quantified Impact & Scale', () => {
    it('detects percentages, latency, scale, efficiency, and team/financial metrics', () => {
      const b1 = 'Achieved 45% reduction in memory overhead.';
      const b2 = 'Reduced p99 latency to 12ms and scaled throughput to 5000 qps.';
      const b3 = 'Processed 10tb of logs across 500k dau records daily.';
      const b4 = 'Saved $250k annually and improved cluster efficiency by 30%.';
      const b5 = 'Managed a team of 8 engineers and mentored 4 direct reports.';

      expect(isBulletQuantified(b1).hasMetrics).toBe(true);
      expect(isBulletQuantified(b2).hasMetrics).toBe(true);
      expect(isBulletQuantified(b3).hasMetrics).toBe(true);
      expect(isBulletQuantified(b4).hasMetrics).toBe(true);
      expect(isBulletQuantified(b5).hasMetrics).toBe(true);

      const metrics = extractQuantifiableMetrics(b2);
      expect(metrics.some((m) => m.includes('12ms') || m.includes('5000 qps'))).toBe(true);
    });

    it('awards 30 pts when >= 60% of bullets are quantified', () => {
      const bullets = [
        'Reduced query latency by 45% across 200 nodes.',
        'Engineered caching pipeline scaling to 10M dau.',
        'Built microservice saving $120k in cloud compute.',
        'Collaborated with product designers on roadmap.',
        'Documented architecture decisions in team wiki.',
      ];
      // 3 of 5 = 60%
      const result = evaluateQuantifiedImpact(bullets);
      expect(result.impactDensity).toBe(0.6);
      expect(result.score).toBe(30);
    });

    it('awards 22 pts when 40% - 59% of bullets are quantified', () => {
      const bullets = [
        'Reduced query latency by 45% across 200 nodes.',
        'Engineered caching pipeline scaling to 10M dau.',
        'Refactored authentication middleware.',
        'Collaborated with product designers on roadmap.',
        'Documented architecture decisions in team wiki.',
      ];
      // 2 of 5 = 40%
      const result = evaluateQuantifiedImpact(bullets);
      expect(result.impactDensity).toBe(0.4);
      expect(result.score).toBe(22);
    });

    it('awards 14 pts when 20% - 39% of bullets are quantified', () => {
      const bullets = [
        'Reduced query latency by 45% across 200 nodes.',
        'Updated unit test suite.',
        'Refactored authentication middleware.',
        'Collaborated with product designers on roadmap.',
        'Documented architecture decisions in team wiki.',
      ];
      // 1 of 5 = 20%
      const result = evaluateQuantifiedImpact(bullets);
      expect(result.impactDensity).toBe(0.2);
      expect(result.score).toBe(14);
    });

    it('awards 6 pts when < 20% of bullets are quantified, and 0 pts for 0 bullets', () => {
      const unquantifiedBullets = [
        'Maintained bug backlog in Jira.',
        'Wrote backend controllers.',
      ];
      const result = evaluateQuantifiedImpact(unquantifiedBullets);
      expect(result.impactDensity).toBe(0);
      expect(result.score).toBe(6);

      const emptyResult = evaluateQuantifiedImpact([]);
      expect(emptyResult.impactDensity).toBe(0);
      expect(emptyResult.score).toBe(0);
    });
  });

  // ==========================================================================
  // Pillar 2: Contextual Hard-Skill Integration (25 Points Max)
  // ==========================================================================
  describe('Pillar 2: Contextual Hard-Skill Integration', () => {
    it('awards 25 pts when >= 65% of listed skills appear in role descriptions', () => {
      const skills = ['Go', 'Kubernetes', 'Redis', 'PostgreSQL', 'Docker'];
      const bullets = [
        'Engineered microservices using Go and Kubernetes.',
        'Optimized caching layer using Redis, reducing query times.',
        'Automated database migrations on PostgreSQL.',
      ];
      // 4 of 5 (Go, Kubernetes, Redis, PostgreSQL) = 80% >= 65%
      const result = evaluateSkillIntegration(skills, bullets);
      expect(result.ratio).toBeGreaterThanOrEqual(0.65);
      expect(result.score).toBe(25);
      expect(result.integrated).toContain('Go');
      expect(result.integrated).toContain('Kubernetes');
      expect(result.missing).toContain('Docker');
    });

    it('awards 18 pts for 45% - 64%, 10 pts for 25% - 44%, and 4 pts for < 25%', () => {
      const skills = ['Go', 'Kubernetes', 'Redis', 'PostgreSQL'];
      // 2 of 4 = 50%
      const res18 = evaluateSkillIntegration(skills, ['Engineered backend in Go with Redis.']);
      expect(res18.ratio).toBe(0.5);
      expect(res18.score).toBe(18);

      // 1 of 4 = 25%
      const res10 = evaluateSkillIntegration(skills, ['Implemented Redis cluster.']);
      expect(res10.ratio).toBe(0.25);
      expect(res10.score).toBe(10);

      // 0 of 4 = 0%
      const res4 = evaluateSkillIntegration(skills, ['Worked on general backend tasks.']);
      expect(res4.ratio).toBe(0);
      expect(res4.score).toBe(4);

      // Empty skills list
      const resEmpty = evaluateSkillIntegration([], ['Wrote Go code.']);
      expect(resEmpty.score).toBe(0);
    });
  });

  // ==========================================================================
  // Pillar 3: Action Verb & Ownership Strength (20 Points Max)
  // ==========================================================================
  describe('Pillar 3: Action Verb & Ownership Strength', () => {
    it('awards 20 pts when all bullets start with strong execution/ownership verbs (+1.0)', () => {
      const bullets = [
        'Architected real-time payments platform.',
        'Engineered distributed database replica.',
        'Automated multi-region CI/CD deployments.',
      ];
      const result = evaluateVerbStrength(bullets);
      expect(result.averageOwnership).toBe(1.0);
      expect(result.score).toBe(20);
      expect(result.strongCount).toBe(3);
    });

    it('awards 10 pts when all bullets start with neutral verbs (+0.5)', () => {
      const bullets = [
        'Created initial database migration.',
        'Maintained internal tooling dashboard.',
        'Developed REST endpoints for customers.',
      ];
      const result = evaluateVerbStrength(bullets);
      expect(result.averageOwnership).toBe(0.5);
      expect(result.score).toBe(10);
      expect(result.neutralCount).toBe(3);
    });

    it('penalizes passive duty openers (-1.0) and floors negative scores to 0', () => {
      const bullets = [
        'Responsible for maintaining legacy codebase.',
        'Worked on customer support bugfixes.',
        'Assisted in data pipeline refactor.',
      ];
      const result = evaluateVerbStrength(bullets);
      expect(result.averageOwnership).toBe(-1.0);
      expect(result.score).toBe(0);
      expect(result.weakCount).toBe(3);
    });

    it('scales mixed strong, neutral, and weak bullets accurately', () => {
      // 1 strong (+1.0), 1 neutral (+0.5) => average = 0.75 => 15 pts
      const bullets = [
        'Engineered search ingestion pipeline.',
        'Developed GraphQL schema resolvers.',
      ];
      const result = evaluateVerbStrength(bullets);
      expect(result.averageOwnership).toBe(0.75);
      expect(result.score).toBe(15);
    });

    it('handles empty bullet array gracefully with 0 score', () => {
      const result = evaluateVerbStrength([]);
      expect(result.score).toBe(0);
      expect(result.averageOwnership).toBe(0);
    });
  });

  // ==========================================================================
  // Pillar 4: Signal Density & Structural Parseability (15 Points Max)
  // ==========================================================================
  describe('Pillar 4: Signal Density & Structural Parseability', () => {
    it('awards full 15 pts for valid dates, clean headings, and compliant bullet lengths (12-32 words)', () => {
      const profile: NormalizedProfile = {
        fullName: 'Jane Doe',
        headline: 'Staff Engineer',
        summary: 'Experienced distributed systems engineer.',
        experiences: [
          {
            title: 'Staff Software Engineer',
            company: 'Stripe',
            startDate: '2021-01',
            endDate: 'Present',
            isCurrent: true,
            bulletPoints: [
              'Architected distributed ledger service handling 50k transactions per second, reducing settlement latency by 40% using Go and Kafka.',
              'Spearheaded automated compliance pipeline across 8 distributed microservices, saving $200k in third-party audit consulting fees annually.',
            ],
          },
        ],
        skills: ['Go', 'Kafka'],
        education: [],
        certifications: [],
        contactInfo: { websites: [] },
      };

      const bullets = profile.experiences[0].bulletPoints!;
      const result = evaluateStructuralParseability(profile, bullets);
      expect(result.dateScore).toBe(5);
      expect(result.structureScore).toBe(5);
      expect(result.lengthScore).toBe(5);
      expect(result.score).toBe(15);
    });

    it('deducts points for walls of text (> 38 words) or single-line stubs (< 7 words)', () => {
      const profile: NormalizedProfile = {
        fullName: 'Jane Doe',
        headline: 'Engineer',
        experiences: [
          {
            title: 'Developer',
            company: 'Tech',
            startDate: '2020',
            bulletPoints: [
              'Fixed bugs.', // 2 words (< 7)
              'This is an exceptionally long and rambling run-on sentence describing every minor detail of daily operations without clear formatting or impact and just filling up unnecessary line items across more than thirty-eight distinct words which destroys applicant tracking readability.', // > 38 words
            ],
          },
        ],
        skills: [],
        education: [],
        certifications: [],
        contactInfo: { websites: [] },
      };

      const bullets = profile.experiences[0].bulletPoints!;
      const result = evaluateStructuralParseability(profile, bullets);
      expect(result.lengthScore).toBeLessThan(3);
    });

    it('awards 0 pts if profile has no experiences or dates', () => {
      const emptyProfile: NormalizedProfile = {
        fullName: 'Empty User',
        headline: '',
        experiences: [],
        skills: [],
        education: [],
        certifications: [],
        contactInfo: { websites: [] },
      };
      const result = evaluateStructuralParseability(emptyProfile, []);
      expect(result.score).toBe(0);
    });
  });

  // ==========================================================================
  // Pillar 5: Recruiter Search Targeting (10 Points Max)
  // ==========================================================================
  describe('Pillar 5: Recruiter Search Targeting', () => {
    it('awards 10 pts for structured headline and 40-120 word summary', () => {
      const profile: NormalizedProfile = {
        fullName: 'Alex Vance',
        headline: 'Senior Backend Engineer | Distributed Systems | Go, AWS, Kubernetes',
        summary:
          'Senior software engineer with 8+ years of deep experience architecting fault-tolerant distributed cloud platforms. Specialized in high-throughput data streaming, microservice decomposition, and low-latency databases. Successfully led high-performing engineering teams delivering mission-critical infrastructure with 99.99% reliability across global production environments. Looking to scale next-generation architectures.',
        experiences: [],
        skills: [],
        education: [],
        certifications: [],
        contactInfo: { websites: [] },
      };

      const result = evaluateRecruiterTargeting(profile);
      expect(result.headlineScore).toBe(5);
      expect(result.summaryScore).toBe(5);
      expect(result.score).toBe(10);
    });

    it('penalizes vague phrases in headline ("aspiring developer", "looking for opportunities")', () => {
      const vagueProfile: NormalizedProfile = {
        fullName: 'Bob Smith',
        headline: 'Aspiring Developer looking for opportunities',
        summary: 'Brief summary.',
        experiences: [],
        skills: [],
        education: [],
        certifications: [],
        contactInfo: { websites: [] },
      };

      const result = evaluateRecruiterTargeting(vagueProfile);
      expect(result.headlineScore).toBe(0);
    });

    it('handles empty headline and summary with 0 score', () => {
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

      const result = evaluateRecruiterTargeting(emptyProfile);
      expect(result.score).toBe(0);
      expect(result.headlineScore).toBe(0);
      expect(result.summaryScore).toBe(0);
    });
  });

  // ==========================================================================
  // End-to-End ATS Audit & Contract Output
  // ==========================================================================
  describe('evaluateProfileAts (End-to-End 5-Pillar Model)', () => {
    it('scores an optimized technical profile in the top tier (>= 80 pts) with comprehensive breakdown', () => {
      const strongProfile: NormalizedProfile = {
        fullName: 'Elena Rostova',
        headline: 'Staff Distributed Systems Engineer | Go, Kubernetes, Cloud Infrastructure',
        summary:
          'Passionate distributed systems architect with 10+ years scaling mission-critical cloud infrastructure. Proven history of optimizing low-latency architectures, mentoring senior engineers, and leading multi-region deployments with high availability and resilience across global enterprise systems. Adept at driving cloud-native modernization and high-concurrency systems.',
        experiences: [
          {
            title: 'Staff Systems Engineer',
            company: 'Datadog',
            startDate: '2021',
            endDate: 'Present',
            isCurrent: true,
            bulletPoints: [
              'Architected distributed systems metric ingestion pipeline handling 10M events/sec, reducing latency by 45% using Go on Kubernetes.',
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
              'Optimized geospatial indexing service, slashing memory footprint by 35% across 200 nodes using Redis caching.',
              'Automated CI/CD and Docker container deployment pipelines, accelerating developer release velocity by 3x.',
            ],
          },
        ],
        skills: ['Go', 'Kubernetes', 'Redis', 'Docker', 'Distributed Systems'],
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

      // Verify Total Score
      expect(result.totalScore).toBeGreaterThanOrEqual(80);
      expect(result.compositeScore).toBe(result.totalScore);

      // Verify Category Breakdown
      expect(result.categoryBreakdown.quantifiedImpact.max).toBe(30);
      expect(result.categoryBreakdown.quantifiedImpact.score).toBe(30);
      expect(result.categoryBreakdown.skillIntegration.max).toBe(25);
      expect(result.categoryBreakdown.skillIntegration.score).toBeGreaterThanOrEqual(18);
      expect(result.categoryBreakdown.verbStrength.max).toBe(20);
      expect(result.categoryBreakdown.verbStrength.score).toBeGreaterThanOrEqual(15);
      expect(result.categoryBreakdown.structuralParseability.max).toBe(15);
      expect(result.categoryBreakdown.structuralParseability.score).toBe(15);
      expect(result.categoryBreakdown.recruiterTargeting.max).toBe(10);
      expect(result.categoryBreakdown.recruiterTargeting.score).toBe(10);

      // Verify Actionable Output Contracts
      expect(Array.isArray(result.actionableFeedback)).toBe(true);
      expect(Array.isArray(result.priorityFixes)).toBe(true);
      expect(result.priorityFixes.length).toBeLessThanOrEqual(3);
      expect(result.strengths.length).toBeGreaterThan(0);
    });

    it('scores an underdeveloped/empty profile under 20 pts and returns top-3 priority fixes', () => {
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

      expect(result.totalScore).toBeLessThan(20);
      expect(result.priorityFixes.length).toBeGreaterThan(0);
      expect(result.priorityFixes.length).toBeLessThanOrEqual(3);
      expect(result.criticalRemediations.length).toBeGreaterThanOrEqual(2);
    });

    it('flags non-quantified bullets and passive verbs in actionableFeedback', () => {
      const passiveProfile: NormalizedProfile = {
        fullName: 'Alex',
        headline: 'Software Developer',
        summary: 'Brief overview of background.',
        experiences: [
          {
            title: 'Junior Developer',
            company: 'Tech Startup',
            startDate: '2022',
            bulletPoints: [
              'Responsible for helping with website bug fixes.',
              'Worked on daily customer support tickets.',
            ],
          },
        ],
        skills: ['React', 'CSS'],
        education: [],
        certifications: [],
        contactInfo: { websites: [] },
      };

      const result = evaluateProfileAts(passiveProfile);

      expect(result.totalScore).toBeLessThan(50);
      expect(result.actionableFeedback.some((f) => f.includes('passive verb'))).toBe(true);
      expect(result.actionableFeedback.some((f) => f.includes('lacks quantifiable metrics'))).toBe(true);
      expect(result.priorityFixes.some((p) => p.includes('Quantified Impact') || p.includes('metrics'))).toBe(true);
    });
  });

  // ==========================================================================
  // Individual Bullet Audit (auditBullet)
  // ==========================================================================
  describe('auditBullet', () => {
    it('rates full Google XYZ compliant bullet as 100 with no negative feedback', () => {
      const bullet =
        'Architected real-time payments platform, improving throughput by 300% by deploying Redis caching and Go microservices.';
      const result = auditBullet(bullet);

      expect(result.ownershipCategory).toBe('strong');
      expect(result.hasMetrics).toBe(true);
      expect(result.isXYZCompliant).toBe(true);
      expect(result.isWeakStarter).toBe(false);
      expect(result.score).toBe(100);
      expect(result.feedback).toHaveLength(0);
    });

    it('identifies weak starter phrases and deducts points', () => {
      const bullet = 'Responsible for maintaining server infrastructure.';
      const result = auditBullet(bullet);

      expect(result.isWeakStarter).toBe(true);
      expect(result.ownershipCategory).toBe('weak');
      expect(result.ownershipScore).toBe(-1.0);
      expect(result.hasMetrics).toBe(false);
      expect(result.score).toBeLessThanOrEqual(50);
      expect(result.feedback.some((f) => f.includes('Replace weak duty starter'))).toBe(true);
    });
  });
});
