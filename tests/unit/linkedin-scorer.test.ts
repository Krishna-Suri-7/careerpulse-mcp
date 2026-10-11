import { describe, it, expect } from 'vitest';
import {
  evaluateHeadlineSeo,
  evaluateAboutSection,
  evaluateExperienceProof,
  evaluateSkillsRelevance,
  evaluateAlgorithmicActivity,
  auditLinkedInLandingPage,
} from '../../src/analytics/linkedin-scorer.js';
import { TOOL_REGISTRY } from '../../src/handlers/tool-registry.js';
import { NormalizedProfile, NormalizedExperience } from '../../src/contracts/profile-schema.js';

describe('LinkedIn Landing Page Scorer (Unit)', () => {
  // ==========================================================================
  // Pillar 1: Headline SEO & Hook (25 Points)
  // ==========================================================================
  describe('Pillar 1: Headline SEO & Hook', () => {
    it('awards full 25 pts for concrete title, 3 clustered skills, and optimal character length (70-200 chars)', () => {
      const headline =
        'Staff Backend Engineer | Distributed Systems | Go • Kubernetes • AWS | 10M+ Req/Sec';
      const result = evaluateHeadlineSeo(headline, 'Staff Backend Engineer', [
        'Go',
        'Kubernetes',
        'AWS',
      ]);

      expect(result.targetRolePresence).toBe(10);
      expect(result.techStackClustering).toBe(10);
      expect(result.characterEfficiency).toBe(5);
      expect(result.score).toBe(25);
      expect(result.rewrites.variantA).toBeDefined();
      expect(result.rewrites.variantB).toBeDefined();
    });

    it('penalizes vague phrases ("Aspiring", "Passionate student", "Seeking opportunities") with 0 pts', () => {
      const vagueHeadline =
        'Aspiring Software Engineer | Passionate student looking for opportunities';
      const result = evaluateHeadlineSeo(vagueHeadline);

      expect(result.targetRolePresence).toBe(0);
      expect(result.vaguePhrasesFound.length).toBeGreaterThan(0);
    });

    it('evaluates tech stack clustering: 2-4 skills (10 pts), 1 skill (4 pts), 0 skills (0 pts)', () => {
      // 3 skills -> 10 pts
      const res3 = evaluateHeadlineSeo('Senior Software Engineer | React | Node.js | TypeScript');
      expect(res3.techStackClustering).toBe(10);

      // 1 skill -> 4 pts
      const res1 = evaluateHeadlineSeo('Senior Software Engineer | React');
      expect(res1.techStackClustering).toBe(4);

      // 0 skills -> 0 pts
      const res0 = evaluateHeadlineSeo('Senior Software Engineer and Tech Leader');
      expect(res0.techStackClustering).toBe(0);
    });

    it('evaluates character efficiency: 70-200 chars (5 pts), 40-69 chars (2 pts), <40 chars (0 pts)', () => {
      const optimal = 'Senior Backend Engineer | Go | Distributed Systems | High Concurrency Systems'; // 78 chars
      expect(evaluateHeadlineSeo(optimal).characterEfficiency).toBe(5);

      const brief = 'Senior Backend Engineer | Go'; // 28 chars (< 40)
      expect(evaluateHeadlineSeo(brief).characterEfficiency).toBe(0);
    });
  });

  // ==========================================================================
  // Pillar 2: "Above-the-Fold" About Section (20 Points)
  // ==========================================================================
  describe('Pillar 2: "Above-the-Fold" About Section', () => {
    it('awards full 20 pts when first 250 chars declare specialty/stack without filler, 100-350 words, and direct CTA', () => {
      const summary = `Staff backend architect specializing in high-throughput distributed systems across Go, Kubernetes, and AWS. Over 10 years scaling real-time transaction engines and multi-region microservices handling 50k TPS for global financial and enterprise cloud customers.

Key Technical Competencies:
- Low-latency architecture design, fault-tolerant consensus, and microservice decomposition
- Real-time stream processing and distributed event logging with Kafka, Flink, and Redis
- Cloud-native infrastructure automation, observability pipelines, and container orchestration on AWS and Kubernetes
- Database performance tuning, automated sharding, and high-concurrency read replicas on PostgreSQL

Proven track record of mentoring 15+ senior engineers, driving technical hiring standards, and leading company-wide reliability initiatives across multiple engineering squads. Contact me directly at elena@cloudsystems.io or explore my open-source code repositories at github.com/elena-systems.`;

      const result = evaluateAboutSection(summary, { email: 'elena@cloudsystems.io' });

      expect(result.hookEfficiency).toBe(10);
      expect(result.hasIntroFiller).toBe(false);
      expect(result.depthAndStructure).toBe(5);
      expect(result.directContactCTA).toBe(5);
      expect(result.hasDirectCTA).toBe(true);
      expect(result.score).toBe(20);
    });

    it('penalizes introductory filler ("Welcome to my profile", "Hi there, my name is") with 0 hook pts', () => {
      const fillerSummary =
        'Welcome to my profile! Hi there, my name is John and I am looking for a challenging role in engineering.';
      const result = evaluateAboutSection(fillerSummary);

      expect(result.hookEfficiency).toBe(0);
      expect(result.hasIntroFiller).toBe(true);
      expect(result.detectedFiller).toBeDefined();
    });

    it('awards 0 directContactCTA pts when email, GitHub, or portfolio link are absent', () => {
      const noCtaSummary =
        'Senior backend engineer specializing in distributed systems. Proven track record in designing cloud microservices.';
      const result = evaluateAboutSection(noCtaSummary);

      expect(result.directContactCTA).toBe(0);
      expect(result.hasDirectCTA).toBe(false);
    });
  });

  // ==========================================================================
  // Pillar 3: Experience & Project Proof-of-Work (30 Points)
  // ==========================================================================
  describe('Pillar 3: Experience & Project Proof-of-Work', () => {
    it('awards full 30 pts for strong opening verbs + system named, >= 50% metrics, and artifact presence', () => {
      const experiences: NormalizedExperience[] = [
        {
          title: 'Staff Systems Engineer',
          company: 'Fintech Corp',
          bulletPoints: [
            'Architected distributed ledger platform handling 50k TPS, reducing latency by 45% using Go on Kubernetes.',
            'Spearheaded automated testing pipeline across 12 services, accelerating developer velocity by 3x.',
            'Repository: github.com/fintech-corp/ledger-core',
          ],
        },
        {
          title: 'Senior Backend Engineer',
          company: 'Cloud Corp',
          bulletPoints: [
            'Engineered event ingestion pipeline streaming 10M events daily, saving $150k annually.',
          ],
        },
      ];

      const result = evaluateExperienceProof(experiences);

      expect(result.openingBulletStrength).toBe(10);
      expect(result.xyzMetricDensity).toBe(15);
      expect(result.artifactPresence).toBe(5);
      expect(result.artifactsFound.length).toBeGreaterThan(0);
      expect(result.score).toBe(30);
    });

    it('penalizes passive opening bullets and lack of quantifiable metrics', () => {
      const passiveExperiences: NormalizedExperience[] = [
        {
          title: 'Junior Developer',
          company: 'Legacy Agency',
          bulletPoints: [
            'Helped team with weekly website updates and ticket triage.',
            'Worked on bugfixes.',
          ],
        },
      ];

      const result = evaluateExperienceProof(passiveExperiences);

      expect(result.openingBulletStrength).toBeLessThanOrEqual(2);
      expect(result.xyzMetricDensity).toBeLessThanOrEqual(2);
      expect(result.artifactPresence).toBe(0);
      expect(result.score).toBeLessThanOrEqual(5);
    });

    it('handles empty experiences array with 0 score', () => {
      const result = evaluateExperienceProof([]);
      expect(result.score).toBe(0);
      expect(result.totalRoles).toBe(0);
    });
  });

  // ==========================================================================
  // Pillar 4: Skills Graph Relevance (15 Points)
  // ==========================================================================
  describe('Pillar 4: Skills Graph Relevance', () => {
    it('awards full 15 pts when top 3 pinned skills align with role and are mapped into bullet copy', () => {
      const skills = ['Go', 'Kubernetes', 'AWS', 'Redis', 'Docker'];
      const experiences: NormalizedExperience[] = [
        {
          title: 'Staff Engineer',
          company: 'Datadog',
          bulletPoints: [
            'Built real-time telemetry pipeline in Go deployed on Kubernetes across AWS clusters.',
            'Optimized Redis caching layer, reducing load on PostgreSQL.',
          ],
        },
      ];

      const result = evaluateSkillsRelevance(
        skills,
        experiences,
        'Staff Systems Engineer',
        'Staff Systems Engineer | Go, Kubernetes, AWS'
      );

      expect(result.topThreeAlignment).toBe(10);
      expect(result.contextualMapping).toBe(5);
      expect(result.score).toBe(15);
    });

    it('returns 0 score when profile has empty skills list', () => {
      const result = evaluateSkillsRelevance([], []);
      expect(result.score).toBe(0);
    });
  });

  // ==========================================================================
  // Pillar 5: Algorithmic Activity & Recency (10 Points)
  // ==========================================================================
  describe('Pillar 5: Algorithmic Activity & Recency', () => {
    it('awards 10 pts when recent technical post text is provided', () => {
      const result = evaluateAlgorithmicActivity([], undefined, 'Recently completed refactoring our auth flow to JWT with Redis.');
      expect(result.score).toBe(10);
      expect(result.status).toBe('active');
    });

    it('awards 10 pts for activity <= 30 days ago, 5 pts for 31-90 days, 0 pts for > 90 days', () => {
      expect(evaluateAlgorithmicActivity([], 12).score).toBe(10);
      expect(evaluateAlgorithmicActivity([], 45).score).toBe(5);
      expect(evaluateAlgorithmicActivity([], 120).score).toBe(0);
    });

    it('awards 8 pts if active current role exists without explicit activity log', () => {
      const experiences: NormalizedExperience[] = [
        {
          title: 'Staff Engineer',
          company: 'Stripe',
          isCurrent: true,
          endDate: 'Present',
        },
      ];
      const result = evaluateAlgorithmicActivity(experiences);
      expect(result.score).toBe(8);
      expect(result.status).toBe('active');
    });

    it('awards 0 pts if profile has no active role and no recent activity', () => {
      const experiences: NormalizedExperience[] = [
        {
          title: 'Contractor',
          company: 'Past Corp',
          isCurrent: false,
          endDate: '2021',
        },
      ];
      const result = evaluateAlgorithmicActivity(experiences);
      expect(result.score).toBe(0);
      expect(result.status).toBe('stale');
    });
  });

  // ==========================================================================
  // End-to-End Landing Page Audit & Critical Checklist
  // ==========================================================================
  describe('auditLinkedInLandingPage (End-to-End)', () => {
    it('scores an optimized LinkedIn landing page in the high tier (>= 85 pts) with actionable rewrites', () => {
      const strongProfile: NormalizedProfile = {
        fullName: 'Maya Lin',
        headline:
          'Staff Distributed Systems Engineer | Go • Kubernetes • AWS • Kafka | 50k TPS Payments',
        summary: `Staff distributed systems architect specializing in high-throughput cloud infrastructure across Go, Kubernetes, and AWS. Over 10 years scaling real-time transaction platforms and event-driven architectures.

Achievements:
- Architected ledger service handling 50k TPS with 99.99% reliability
- Reduced multi-region data replication latency by 45% using Kafka and Redis
- Led and mentored cross-functional engineering squads across 4 countries

Reach out directly at maya.lin@systems-scale.com or view my GitHub at github.com/mayalin-code.`,
        experiences: [
          {
            title: 'Staff Systems Architect',
            company: 'Fintech Global',
            isCurrent: true,
            endDate: 'Present',
            bulletPoints: [
              'Architected distributed payments platform handling 50k TPS, reducing settlement latency by 45% using Go on Kubernetes.',
              'Spearheaded automated resilience testing pipeline across 15 microservices, cutting outage recovery time by 60%.',
              'Project repository: github.com/fintech-global/payments-engine',
            ],
          },
          {
            title: 'Senior Backend Engineer',
            company: 'Cloud Corp',
            bulletPoints: [
              'Engineered telemetry ingestion pipeline streaming 10M events daily, saving $200k in infrastructure costs.',
            ],
          },
        ],
        skills: ['Go', 'Kubernetes', 'AWS', 'Kafka', 'Redis', 'Docker'],
        education: [
          {
            school: 'UC Berkeley',
            degree: 'B.S. Computer Science',
          },
        ],
        contactInfo: {
          email: 'maya.lin@systems-scale.com',
          websites: ['https://github.com/mayalin-code'],
        },
      };

      const result = auditLinkedInLandingPage(strongProfile, {
        targetRole: 'Staff Distributed Systems Engineer',
        activityDaysAgo: 5,
      });

      expect(result.overallScore).toBeGreaterThanOrEqual(85);
      expect(result.headlineAudit.rewrites.variantA).toBeDefined();
      expect(result.aboutSectionAudit.hasIntroFiller).toBe(false);
      expect(result.experienceScore.openingBulletsStrong).toBeGreaterThanOrEqual(1);
      expect(Array.isArray(result.criticalChecklist)).toBe(true);
    });

    it('evaluates an underdeveloped profile, assigning low score and returning top-3 critical checklist actions', () => {
      const weakProfile: NormalizedProfile = {
        fullName: 'Alex Coder',
        headline: 'Aspiring developer looking for opportunities',
        summary: 'Welcome to my profile. I code.',
        experiences: [
          {
            title: 'Intern',
            company: 'Old Corp',
            bulletPoints: ['Worked on bug fixes and assisted with meetings.'],
          },
        ],
        skills: ['HTML'],
        education: [],
        contactInfo: { websites: [] },
      };

      const result = auditLinkedInLandingPage(weakProfile);

      expect(result.overallScore).toBeLessThan(40);
      expect(result.criticalChecklist.length).toBe(3);
      expect(result.headlineAudit.vaguePhrasesFound.length).toBeGreaterThan(0);
      expect(result.aboutSectionAudit.hasIntroFiller).toBe(true);
    });
  });

  // ==========================================================================
  // MCP Tool Handler Integration
  // ==========================================================================
  describe('audit_linkedin_page MCP Tool Handler', () => {
    it('executes via TOOL_REGISTRY and returns structured landing page audit payload', async () => {
      const sampleProfile = {
        headline: 'Senior Backend Engineer | Go, Kubernetes, AWS',
        summary:
          'Backend architect with 8 years building distributed platforms in Go. Contact: alex@cloud.io github.com/alex-dev',
        experiences: [
          {
            title: 'Senior Backend Engineer',
            company: 'Cloud Corp',
            isCurrent: true,
            bulletPoints: [
              'Architected distributed service processing 50k TPS, reducing latency by 40% on AWS.',
            ],
          },
        ],
        skills: ['Go', 'Kubernetes', 'AWS'],
      };

      const response = await TOOL_REGISTRY['audit_linkedin_page'].handler({
        profile: sampleProfile,
        targetRole: 'Senior Backend Engineer',
        activityDaysAgo: 10,
      });

      expect(response.isError).toBe(false);
      const parsed = JSON.parse(response.content[0].text);
      expect(parsed.overallScore).toBeDefined();
      expect(parsed.headlineAudit).toBeDefined();
      expect(parsed.aboutSectionAudit).toBeDefined();
      expect(parsed.experienceScore).toBeDefined();
      expect(parsed.criticalChecklist).toBeDefined();
      expect(parsed.categoryBreakdown).toBeDefined();
    });

    it('returns isError: true when malformed input is passed', async () => {
      const response = await TOOL_REGISTRY['audit_linkedin_page'].handler({
        profile: '{ invalid json without closing bracket',
      });

      expect(response.isError).toBe(true);
      expect(response.content[0].text).toContain('Failed to audit LinkedIn landing page');
    });
  });
});
