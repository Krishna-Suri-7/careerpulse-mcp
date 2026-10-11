import { describe, it, expect } from 'vitest';
import { calculateKeywordGap } from '../../src/analytics/keyword-gap.js';
import { CompleteProfile } from '../../src/contracts/profile-schema.js';

describe('Keyword Gap Analysis Engine (Unit - keyword-gap.ts)', () => {
  const profile: CompleteProfile = {
    fullName: 'Jane Developer',
    headline: 'Senior Backend Engineer | TypeScript, Node.js, PostgreSQL',
    summary: 'Experienced distributed systems engineer passionate about cloud microservices.',
    experiences: [
      {
        title: 'Senior Software Engineer',
        company: 'Cloud Corp',
        bulletPoints: [
          'Engineered event-driven pipeline in Node.js and TypeScript.',
          'Reduced PostgreSQL query latency by 40% with optimized indexing.',
        ],
      },
    ],
    skills: ['TypeScript', 'Node.js', 'PostgreSQL', 'Docker'],
    education: [],
  };

  it('calculates skill gap accurately against target job description', () => {
    const jobDescription = `
      We are looking for a Senior Backend Engineer.
      Requirements:
      - 5+ years with TypeScript and Node.js
      - Deep expertise in PostgreSQL and Redis
      - Strong knowledge of Kubernetes and AWS
      - Experience with CI/CD and automated testing
    `;

    const result = calculateKeywordGap(profile, jobDescription, {
      targetRoleTitle: 'Senior Backend Engineer',
    });

    expect(result.totalJobSkills).toBeGreaterThan(0);
    expect(result.matchedHardSkills).toContain('TypeScript');
    expect(result.matchedHardSkills).toContain('Node.js');
    expect(result.matchedHardSkills).toContain('PostgreSQL');

    // Missing skills
    expect(result.missingHardSkills).toContain('Redis');
    expect(result.missingHardSkills).toContain('Kubernetes');
    expect(result.missingHardSkills).toContain('AWS');

    expect(result.matchedSkillsCount).toBeGreaterThan(0);
    expect(result.missingSkillsCount).toBeGreaterThan(0);
    expect(result.matchPercentage).toBeGreaterThan(0);
    expect(result.matchPercentage).toBeLessThan(100);

    // Gap details structure
    expect(result.gapDetails.length).toBeGreaterThan(0);
    const redisItem = result.gapDetails.find((d) => d.skill === 'Redis');
    expect(redisItem).toBeDefined();
    expect(redisItem?.presentInProfile).toBe(false);

    // Strategic recommendations
    expect(result.recruiterSearchRecommendations.skillsSection.length).toBeGreaterThan(0);
    expect(result.recruiterSearchRecommendations.headline.length).toBeGreaterThan(0);
  });

  it('handles explicit target role keywords alongside JD', () => {
    const result = calculateKeywordGap(profile, 'General software engineering role.', {
      targetRoleKeywords: ['Kafka', 'Go', 'TypeScript'],
    });

    expect(result.matchedHardSkills).toContain('TypeScript');
    expect(result.missingHardSkills).toContain('Apache Kafka');
    expect(result.missingHardSkills).toContain('Go');
  });
});
