import { describe, it, expect } from 'vitest';
import { exportProfileDiffTool } from '../../src/tools/exportProfileDiff.js';

describe('Tool: export_profile_diff', () => {
  const currentProfile = {
    fullName: 'Jordan Lee',
    headline: 'Software Engineer at Acme',
    summary: 'Junior developer looking to learn.',
    skills: ['JavaScript', 'HTML', 'CSS'],
    experiences: [
      {
        title: 'Developer',
        company: 'Acme',
        bulletPoints: ['Worked on website.'],
      },
    ],
    education: [],
  };

  it('generates a clean markdown diff with additions, modifications, and deletions', async () => {
    const updatedProfile = {
      headline: 'Senior Full Stack Engineer | React & Node.js | Scaled Web Apps to 5M DAU',
      summary: 'Impact-focused software engineer with 6+ years shipping high-availability applications.',
      skills: ['JavaScript', 'TypeScript', 'Node.js', 'React', 'PostgreSQL'], // removed HTML, CSS, added TypeScript, Node.js, React, PostgreSQL
      experiences: [
        {
          title: 'Senior Software Engineer',
          company: 'Acme',
          bulletPoints: ['Engineered high-concurrency microservices in Node.js, reducing latency by 35%.'],
        },
      ],
    };

    const result = await exportProfileDiffTool.execute({
      currentProfile,
      updatedProfile,
    });

    expect(result.isError).toBe(false);
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.hasChanges).toBe(true);
    expect(parsed.totalChanges).toBeGreaterThan(0);
    expect(parsed.stats.modifications).toBeGreaterThanOrEqual(1);
    expect(parsed.stats.additions).toBeGreaterThanOrEqual(1);
    expect(parsed.markdownDiff).toContain('# Profile Changes Diff');
    expect(parsed.markdownDiff).toContain('```diff');
    expect(parsed.markdownDiff).toContain('- Software Engineer at Acme');
    expect(parsed.markdownDiff).toContain('+ Senior Full Stack Engineer');
  });

  it('detects no differences when profiles are identical', async () => {
    const result = await exportProfileDiffTool.execute({
      currentProfile,
      updatedProfile: currentProfile,
    });

    expect(result.isError).toBe(false);
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.hasChanges).toBe(false);
    expect(parsed.totalChanges).toBe(0);
    expect(parsed.markdownDiff).toContain('No differences detected');
  });

  it('returns isError: true when currentProfile is malformed', async () => {
    const result = await exportProfileDiffTool.execute({
      currentProfile: 'invalid json string {',
      updatedProfile: currentProfile,
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Error exporting profile diff');
  });
});
