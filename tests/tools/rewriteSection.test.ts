import { describe, it, expect } from 'vitest';
import { rewriteSectionTool } from '../../src/tools/rewriteSection.js';

describe('Tool: rewrite_section', () => {
  it('rewrites headline with 3 distinct options including XYZ-aligned option', async () => {
    const result = await rewriteSectionTool.execute({
      section: 'headline',
      currentContent: 'Software Engineer at Acme Corp',
      targetRole: 'Staff Distributed Systems Engineer',
      focusKeywords: ['Go', 'Kubernetes', 'High Throughput'],
      metrics: ['scaling to 10M+ daily events'],
    });

    expect(result.isError).toBe(false);
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.section).toBe('headline');
    expect(parsed.headlineOptions).toHaveLength(3);
    expect(parsed.primarySuggestion).toContain('Staff Distributed Systems Engineer');
    expect(parsed.keyImprovements.length).toBeGreaterThan(0);
    expect(parsed.headlineOptions[0].characterCount).toBeLessThanOrEqual(220);
  });

  it('rewrites about section with hook, competencies, and XYZ achievements', async () => {
    const result = await rewriteSectionTool.execute({
      section: 'about',
      currentContent: 'I am a backend programmer who likes microservices.',
      targetRole: 'Lead Cloud Infrastructure Architect',
      focusKeywords: ['Terraform', 'Kubernetes', 'AWS', 'Zero Downtime'],
      metrics: ['99.99% uptime', '60% faster deployment velocity'],
    });

    expect(result.isError).toBe(false);
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.section).toBe('about');
    expect(parsed.primarySuggestion).toContain('Lead Cloud Infrastructure Architect');
    expect(parsed.xyzBreakdowns).toBeDefined();
    expect(parsed.xyzBreakdowns.length).toBeGreaterThan(0);
    expect(parsed.keyImprovements.length).toBeGreaterThan(0);
  });

  it('rewrites experience descriptions into Google XYZ format', async () => {
    const rawDuty = 'Responsible for migrating Postgres databases and managing Redis caches.';
    const result = await rewriteSectionTool.execute({
      section: 'experience',
      currentContent: rawDuty,
      targetRole: 'Senior Backend Engineer',
      focusKeywords: ['PostgreSQL', 'Redis', 'Node.js'],
      metrics: ['latency by 45%', '10M+ queries/day'],
    });

    expect(result.isError).toBe(false);
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.section).toBe('experience');
    expect(parsed.xyzBreakdowns).toHaveLength(1);

    const xyz = parsed.xyzBreakdowns[0];
    expect(xyz.accomplishedX).toBeDefined();
    expect(xyz.measuredByY).toBeDefined();
    expect(xyz.byDoingZ).toBeDefined();
    expect(xyz.fullBullet).toContain('by');
    expect(parsed.bullets[0]).toContain('by');
    expect(parsed.markdownDiffSummary).toContain('```diff');
  });

  it('returns isError: true on invalid section enum', async () => {
    const result = await rewriteSectionTool.execute({
      section: 'invalid_section',
      currentContent: 'some text',
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Error rewriting profile section');
  });
});
