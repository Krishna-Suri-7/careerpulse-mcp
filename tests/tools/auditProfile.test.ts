import { describe, it, expect } from 'vitest';
import { auditProfileTool } from '../../src/tools/auditProfile.js';

describe('Tool: audit_profile', () => {
  it('audits a high-quality profile and produces detailed metrics', async () => {
    const strongProfile = {
      fullName: 'Maya Lin',
      headline: 'Principal Backend Architect | Distributed Systems | Node.js, Go, AWS',
      summary:
        'Seasoned software architect with 12+ years designing mission-critical platforms handling millions of users. Proven track record in microservices, low latency systems, and technical leadership. Reach out at maya@example.com',
      experiences: [
        {
          title: 'Principal Engineer',
          company: 'Fintech Scaleup',
          startDate: '2021',
          endDate: 'Present',
          isCurrent: true,
          bulletPoints: [
            'Architected distributed payment ledger handling 50,000 TPS, reducing latency by 45% by deploying Redis clusters and Go microservices.',
            'Spearheaded automated testing pipeline, improving deployment frequency by 3x across 6 engineering squads.',
            'Mentored 8 senior engineers and introduced weekly architecture design reviews.',
          ],
        },
        {
          title: 'Senior Software Engineer',
          company: 'Cloud Corp',
          startDate: '2018',
          endDate: '2021',
          bulletPoints: [
            'Engineered event ingestion platform processing 10M events daily, saving $150k in infrastructure costs.',
          ],
        },
      ],
      skills: ['TypeScript', 'Go', 'AWS', 'Kubernetes', 'PostgreSQL', 'Docker', 'Redis', 'Kafka', 'System Design'],
      education: [
        {
          school: 'UC Berkeley',
          degree: 'B.S.',
          fieldOfStudy: 'Computer Science',
        },
      ],
      contactInfo: {
        email: 'maya@example.com',
        location: 'San Francisco, CA',
      },
    };

    const result = await auditProfileTool.execute({ profile: strongProfile });

    expect(result.isError).toBe(false);
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.audit.overallScore).toBeGreaterThanOrEqual(75);
    expect(parsed.audit.atsReadabilityScore).toBeGreaterThanOrEqual(80);
    expect(parsed.audit.bulletQualityScore).toBeGreaterThanOrEqual(70);
    expect(parsed.audit.strengths.length).toBeGreaterThan(0);
    expect(parsed.summary).toContain('LinkedIn Profile Audit Report');
  });

  it('detects weak bullets and flags duty phrases in underdeveloped profile', async () => {
    const weakProfile = {
      headline: 'Developer',
      summary: 'I code things.',
      experiences: [
        {
          title: 'Developer',
          company: 'Some Corp',
          bulletPoints: [
            'Responsible for fixing bugs.',
            'Worked on web features.',
          ],
        },
      ],
      skills: ['HTML'],
      education: [],
    };

    const result = await auditProfileTool.execute({ profile: weakProfile });

    expect(result.isError).toBe(false);
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.audit.overallScore).toBeLessThan(60);
    expect(parsed.audit.bulletQualityScore).toBeLessThan(50);
    expect(parsed.audit.weaknesses.length).toBeGreaterThan(0);
    expect(parsed.audit.actionableRecommendations.length).toBeGreaterThan(0);

    const firstBulletAudit = parsed.audit.bulletAudits[0].bullets[0];
    expect(firstBulletAudit.isWeak).toBe(true);
    expect(firstBulletAudit.hasMetrics).toBe(false);
  });

  it('handles invalid profile inputs and returns isError: true', async () => {
    const result = await auditProfileTool.execute({
      profile: '{ malformed json string without end',
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Error auditing LinkedIn profile');
  });
});
