import { describe, it, expect } from 'vitest';
import {
  NormalizedProfileSchema,
  NormalizedExperienceSchema,
  NormalizedEducationSchema,
  RawProfileInputSchema,
  IngestProfileDocumentInputSchema,
  EvaluateProfileAtsInputSchema,
  AnalyzeKeywordGapInputSchema,
  SynthesizeSectionPatchInputSchema,
  RenderChangeDiffInputSchema,
} from '../../src/contracts/profile-schema.js';

describe('Contracts & Schemas (Unit)', () => {
  it('validates a complete NormalizedProfileSchema', () => {
    const raw = {
      fullName: 'Sarah Connor',
      headline: 'Principal Infrastructure Architect | Cloud Native & Distributed Systems',
      summary: 'Architect with 12+ years designing mission-critical platforms.',
      experiences: [
        {
          title: 'Principal Architect',
          company: 'Cloud Corp',
          startDate: '2020',
          endDate: 'Present',
          isCurrent: true,
          bulletPoints: ['Architected global Kubernetes clusters across 6 regions.'],
        },
      ],
      skills: ['Go', 'Kubernetes', 'AWS', 'Terraform'],
      education: [
        {
          school: 'MIT',
          degree: 'B.S.',
          fieldOfStudy: 'EECS',
        },
      ],
      contactInfo: {
        email: 'sarah@example.com',
        location: 'Austin, TX',
      },
    };

    const parsed = NormalizedProfileSchema.parse(raw);
    expect(parsed.fullName).toBe('Sarah Connor');
    expect(parsed.experiences).toHaveLength(1);
    expect(parsed.skills).toContain('Go');
  });

  it('populates defaults for minimal NormalizedProfile', () => {
    const parsed = NormalizedProfileSchema.parse({
      headline: 'DevOps Engineer',
    });
    expect(parsed.fullName).toBe('');
    expect(parsed.summary).toBe('');
    expect(parsed.experiences).toEqual([]);
    expect(parsed.skills).toEqual([]);
    expect(parsed.education).toEqual([]);
  });

  it('validates NormalizedExperienceSchema requires title and company', () => {
    expect(() => NormalizedExperienceSchema.parse({})).toThrow();
    const exp = NormalizedExperienceSchema.parse({
      title: 'Senior Engineer',
      company: 'Stripe',
    });
    expect(exp.title).toBe('Senior Engineer');
    expect(exp.bulletPoints).toEqual([]);
  });

  it('validates RawProfileInputSchema transforms JSON string into object', () => {
    const jsonStr = JSON.stringify({
      headline: 'Staff Engineer',
      skills: ['TypeScript', 'Node.js'],
    });
    const parsed = RawProfileInputSchema.parse(jsonStr);
    expect(parsed.headline).toBe('Staff Engineer');
    expect(parsed.skills).toContain('TypeScript');
  });

  it('rejects invalid JSON in RawProfileInputSchema', () => {
    expect(() => RawProfileInputSchema.parse('{ unclosed json')).toThrow();
  });

  it('validates IngestProfileDocumentInputSchema refinement', () => {
    expect(() => IngestProfileDocumentInputSchema.parse({})).toThrow(
      /At least one input source must be provided/
    );
    const valid = IngestProfileDocumentInputSchema.parse({ filePath: './profile.pdf' });
    expect(valid.filePath).toBe('./profile.pdf');
  });

  it('validates AnalyzeKeywordGapInputSchema refinement', () => {
    expect(() =>
      AnalyzeKeywordGapInputSchema.parse({
        profile: { headline: 'Developer' },
      })
    ).toThrow(/Either targetJobDescription or targetRoleKeywords must be provided/);
  });

  it('validates SynthesizeSectionPatchInputSchema and default tone', () => {
    const valid = SynthesizeSectionPatchInputSchema.parse({
      section: 'headline',
      currentContent: 'Software Engineer',
      targetRole: 'Staff Engineer',
    });
    expect(valid.tone).toBe('impactful');
  });

  it('validates RenderChangeDiffInputSchema and default format', () => {
    const valid = RenderChangeDiffInputSchema.parse({
      currentProfile: { headline: 'Old' },
      proposedProfile: { headline: 'New' },
    });
    expect(valid.format).toBe('unified');
  });
});
