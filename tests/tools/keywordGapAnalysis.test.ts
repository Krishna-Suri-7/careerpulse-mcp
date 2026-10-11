import { describe, it, expect } from 'vitest';
import { keywordGapAnalysisTool } from '../../src/tools/keywordGapAnalysis.js';

describe('Tool: keyword_gap_analysis', () => {
  const sampleProfile = {
    fullName: 'David Kim',
    headline: 'Senior Full Stack Engineer | React & Node.js',
    summary: 'Building scalable modern web applications with TypeScript, React, and PostgreSQL.',
    experiences: [
      {
        title: 'Senior Software Engineer',
        company: 'WebTech',
        bulletPoints: [
          'Engineered web services with TypeScript and PostgreSQL.',
          'Mentored junior engineers and led code reviews.',
        ],
      },
    ],
    skills: ['TypeScript', 'React', 'Node.js', 'PostgreSQL', 'Git'],
    education: [],
  };

  it('performs keyword gap analysis against target job description text', async () => {
    const jobDescription = `
      We are looking for a Senior Staff Engineer.
      Requirements:
      - 5+ years of experience with TypeScript, Node.js, and React.
      - Strong expertise with Kubernetes, Docker, and AWS.
      - Hands-on experience with Apache Kafka and distributed systems.
      - Proven track record of cross-functional collaboration and technical leadership.
    `;

    const result = await keywordGapAnalysisTool.execute({
      profile: sampleProfile,
      targetJobDescription: jobDescription,
      targetRoleTitle: 'Senior Staff Engineer',
    });

    expect(result.isError).toBe(false);
    const parsed = JSON.parse(result.content[0].text);

    // Matched skills
    expect(parsed.analysis.matchedHardSkills).toContain('TypeScript');
    expect(parsed.analysis.matchedHardSkills).toContain('Node.js');
    expect(parsed.analysis.matchedHardSkills).toContain('React');

    // Missing skills
    expect(parsed.analysis.missingHardSkills).toContain('Kubernetes');
    expect(parsed.analysis.missingHardSkills).toContain('Apache Kafka');

    // Soft skills
    expect(parsed.analysis.missingSoftSkills).toContain('Cross-Functional Collaboration');

    // Match score
    expect(parsed.analysis.matchScore).toBeGreaterThan(0);
    expect(parsed.analysis.matchScore).toBeLessThanOrEqual(100);

    // Strategic placement advice
    expect(parsed.analysis.strategicPlacementAdvice.skills.length).toBeGreaterThan(0);
    expect(parsed.analysis.strategicPlacementAdvice.headline.length).toBeGreaterThan(0);
    expect(parsed.summary).toContain('Keyword Gap Analysis Report');
  });

  it('performs keyword gap analysis against explicit targetRoleKeywords', async () => {
    const result = await keywordGapAnalysisTool.execute({
      profile: sampleProfile,
      targetRoleKeywords: ['TypeScript', 'Kubernetes', 'Go', 'Mentorship'],
    });

    expect(result.isError).toBe(false);
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.analysis.matchedHardSkills).toContain('TypeScript');
    expect(parsed.analysis.missingHardSkills).toContain('Kubernetes');
    expect(parsed.analysis.missingHardSkills).toContain('Go');
    expect(parsed.analysis.matchedSoftSkills).toContain('Mentorship');
  });

  it('returns isError: true when neither description nor keywords list is provided', async () => {
    const result = await keywordGapAnalysisTool.execute({
      profile: sampleProfile,
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Error conducting keyword gap analysis');
    expect(result.content[0].text).toContain('Either targetJobDescription or targetRoleKeywords must be provided');
  });
});
