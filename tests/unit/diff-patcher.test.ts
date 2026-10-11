import { describe, it, expect } from 'vitest';
import {
  computeLineDiff,
  synthesizeSectionPatchEngine,
  renderChangeDiffEngine,
} from '../../src/patching/diff-patcher.js';
import { NormalizedProfile } from '../../src/contracts/profile-schema.js';

describe('Diff Patcher & XYZ Synthesis Engine (Unit)', () => {
  describe('computeLineDiff', () => {
    it('generates line-by-line diff with - and + markers', () => {
      const oldText = 'Line 1\nOld Line 2\nLine 3';
      const newText = 'Line 1\nNew Line 2\nLine 3';
      const diff = computeLineDiff(oldText, newText);

      expect(diff).toContain('  Line 1');
      expect(diff).toContain('- Old Line 2');
      expect(diff).toContain('+ New Line 2');
      expect(diff).toContain('  Line 3');
    });
  });

  describe('synthesizeSectionPatchEngine', () => {
    it('synthesizes headline with 3 tailored formulas within 220 chars', () => {
      const result = synthesizeSectionPatchEngine({
        section: 'headline',
        currentContent: 'Software Developer',
        targetRole: 'Staff Distributed Systems Engineer',
        focusKeywords: ['Go', 'Kubernetes', 'Cloud'],
        metrics: ['scaling to 10M DAU'],
      });

      expect(result.section).toBe('headline');
      expect(result.alternatives).toHaveLength(3);
      expect(result.synthesizedContent).toContain('Staff Distributed Systems Engineer');
      expect(result.markdownDiff).toContain('```diff');
      for (const alt of result.alternatives || []) {
        expect(alt.characterCount).toBeLessThanOrEqual(220);
      }
    });

    it('synthesizes About section with XYZ achievements and technical competencies', () => {
      const result = synthesizeSectionPatchEngine({
        section: 'about',
        currentContent: 'Experienced developer.',
        targetRole: 'Principal Cloud Architect',
        focusKeywords: ['Kubernetes', 'Terraform', 'AWS'],
        metrics: ['99.99% uptime', '60% faster CI/CD release cycles'],
      });

      expect(result.section).toBe('about');
      expect(result.xyzComponents).toHaveLength(2);
      expect(result.synthesizedContent).toContain('Principal Cloud Architect');
      expect(result.synthesizedContent).toContain('Core Technical Competencies');
      expect(result.rationale.length).toBeGreaterThan(0);
    });

    it('synthesizes experience into Google XYZ format (Accomplished [X] measured by [Y] by doing [Z])', () => {
      const rawDuty = 'Responsible for migrating PostgreSQL databases and tuning query performance.';
      const result = synthesizeSectionPatchEngine({
        section: 'roles',
        currentContent: rawDuty,
        targetRole: 'Senior Database Engineer',
        focusKeywords: ['PostgreSQL', 'Redis', 'Docker'],
        metrics: ['latency by 45%', '10M+ daily transactions'],
      });

      expect(result.section).toBe('experience');
      expect(result.xyzComponents).toBeDefined();
      expect(result.xyzComponents).toHaveLength(1);

      const xyz = result.xyzComponents![0];
      expect(xyz.accomplishedX).toBeDefined();
      expect(xyz.measuredByY).toBeDefined();
      expect(xyz.byDoingZ).toBeDefined();
      expect(xyz.fullStatement).toContain('by');
      expect(result.markdownDiff).toContain('```diff');
    });
  });

  describe('renderChangeDiffEngine', () => {
    const baseline: NormalizedProfile = {
      fullName: 'Alex Vance',
      headline: 'Software Engineer',
      summary: 'Backend developer.',
      skills: ['JavaScript', 'HTML'],
      experiences: [
        {
          title: 'Developer',
          company: 'Acme',
          bulletPoints: ['Built web backend.'],
        },
      ],
      education: [],
      certifications: [],
      contactInfo: { websites: [] },
    };

    it('identifies additions, modifications, and deletions in Markdown change plan', () => {
      const proposed = {
        headline: 'Senior Full Stack Engineer | React & Node.js',
        summary: 'Experienced engineer scaling web platforms.',
        skills: ['JavaScript', 'TypeScript', 'Node.js', 'PostgreSQL'], // added TypeScript, Node.js, PostgreSQL; removed HTML
        experiences: [
          {
            title: 'Senior Engineer',
            company: 'Acme',
            bulletPoints: ['Engineered high-concurrency microservices, reducing latency by 40%.'],
          },
        ],
      };

      const diff = renderChangeDiffEngine(baseline, proposed);

      expect(diff.hasDifferences).toBe(true);
      expect(diff.totalModifications).toBeGreaterThan(0);
      expect(diff.stats.modifications).toBeGreaterThanOrEqual(1);
      expect(diff.stats.additions).toBeGreaterThanOrEqual(1);
      expect(diff.markdownReport).toContain('# Proposed Profile Change Plan');
      expect(diff.markdownReport).toContain('```diff');
      expect(diff.markdownReport).toContain('- Software Engineer');
      expect(diff.markdownReport).toContain('+ Senior Full Stack Engineer');
    });

    it('returns zero differences when comparing identical profile', () => {
      const diff = renderChangeDiffEngine(baseline, baseline);
      expect(diff.hasDifferences).toBe(false);
      expect(diff.totalModifications).toBe(0);
      expect(diff.markdownReport).toContain('No differences detected');
    });
  });
});
