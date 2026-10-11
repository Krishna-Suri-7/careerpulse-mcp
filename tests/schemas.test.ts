import { describe, it, expect } from 'vitest';
import {
  LinkedInProfileSchema,
  ContactInfoSchema,
  ExperienceSchema,
  EducationSchema,
  CertificationSchema,
} from '../src/schemas/profile.js';
import {
  ParseProfilePdfInputSchema,
  AuditProfileInputSchema,
  KeywordGapAnalysisInputSchema,
  RewriteSectionInputSchema,
  ExportProfileDiffInputSchema,
} from '../src/schemas/tools.js';

describe('Profile Schemas', () => {
  it('validates a complete LinkedIn profile', () => {
    const rawProfile = {
      fullName: 'Alex Mercer',
      headline: 'Staff Software Engineer | Distributed Systems | Node.js, Go, AWS',
      summary: 'Experienced distributed systems engineer with 10+ years scaling services.',
      experiences: [
        {
          title: 'Senior Engineer',
          company: 'Acme Corp',
          startDate: 'Jan 2021',
          endDate: 'Present',
          isCurrent: true,
          bulletPoints: ['Engineered multi-region event streaming pipeline.'],
        },
      ],
      skills: ['TypeScript', 'Node.js', 'AWS', 'Kubernetes'],
      education: [
        {
          school: 'University of Washington',
          degree: 'B.S.',
          fieldOfStudy: 'Computer Science',
        },
      ],
      certifications: [
        {
          name: 'AWS Certified Solutions Architect',
          issuer: 'Amazon Web Services',
        },
      ],
      contactInfo: {
        email: 'alex@example.com',
        linkedinUrl: 'https://linkedin.com/in/alex-mercer',
      },
    };

    const parsed = LinkedInProfileSchema.parse(rawProfile);
    expect(parsed.fullName).toBe('Alex Mercer');
    expect(parsed.experiences).toHaveLength(1);
    expect(parsed.skills).toContain('TypeScript');
  });

  it('populates default values for minimal profile', () => {
    const parsed = LinkedInProfileSchema.parse({
      headline: 'Software Engineer',
    });
    expect(parsed.fullName).toBe('');
    expect(parsed.summary).toBe('');
    expect(parsed.experiences).toEqual([]);
    expect(parsed.skills).toEqual([]);
    expect(parsed.education).toEqual([]);
  });

  it('validates ExperienceSchema requires title and company', () => {
    expect(() => ExperienceSchema.parse({})).toThrow();
    expect(() => ExperienceSchema.parse({ title: 'Engineer' })).toThrow();
    const valid = ExperienceSchema.parse({ title: 'Engineer', company: 'Google' });
    expect(valid.company).toBe('Google');
    expect(valid.bulletPoints).toEqual([]);
  });

  it('validates EducationSchema requires school', () => {
    expect(() => EducationSchema.parse({})).toThrow();
    const valid = EducationSchema.parse({ school: 'Stanford University' });
    expect(valid.school).toBe('Stanford University');
  });

  it('validates CertificationSchema', () => {
    const valid = CertificationSchema.parse({ name: 'CKA: Certified Kubernetes Administrator' });
    expect(valid.name).toBe('CKA: Certified Kubernetes Administrator');
  });
});

describe('Tool Input Schemas', () => {
  describe('ParseProfilePdfInputSchema', () => {
    it('accepts filePath', () => {
      const valid = ParseProfilePdfInputSchema.parse({ filePath: '/path/to/profile.pdf' });
      expect(valid.filePath).toBe('/path/to/profile.pdf');
    });

    it('accepts base64', () => {
      const valid = ParseProfilePdfInputSchema.parse({ base64: 'JVBERi0xLjQK...' });
      expect(valid.base64).toBe('JVBERi0xLjQK...');
    });

    it('rejects when neither filePath nor base64 is provided', () => {
      expect(() => ParseProfilePdfInputSchema.parse({})).toThrow(
        /Either filePath or base64 must be provided/
      );
    });
  });

  describe('AuditProfileInputSchema', () => {
    it('accepts profile object', () => {
      const valid = AuditProfileInputSchema.parse({
        profile: {
          headline: 'Tech Lead',
          skills: ['Go', 'Docker'],
        },
      });
      expect(valid.profile.headline).toBe('Tech Lead');
    });

    it('accepts JSON serialized string and parses to object', () => {
      const jsonStr = JSON.stringify({
        headline: 'Tech Lead',
        skills: ['Go'],
      });
      const valid = AuditProfileInputSchema.parse({ profile: jsonStr });
      expect(valid.profile.headline).toBe('Tech Lead');
    });

    it('rejects invalid JSON string', () => {
      expect(() => AuditProfileInputSchema.parse({ profile: 'not-a-json' })).toThrow();
    });
  });

  describe('KeywordGapAnalysisInputSchema', () => {
    it('accepts targetJobDescription', () => {
      const valid = KeywordGapAnalysisInputSchema.parse({
        profile: { headline: 'Dev' },
        targetJobDescription: 'Seeking Senior TypeScript and AWS Engineer',
      });
      expect(valid.targetJobDescription).toBeDefined();
    });

    it('accepts targetRoleKeywords', () => {
      const valid = KeywordGapAnalysisInputSchema.parse({
        profile: { headline: 'Dev' },
        targetRoleKeywords: ['TypeScript', 'Kubernetes'],
      });
      expect(valid.targetRoleKeywords).toHaveLength(2);
    });

    it('rejects when neither job description nor keywords list provided', () => {
      expect(() =>
        KeywordGapAnalysisInputSchema.parse({
          profile: { headline: 'Dev' },
        })
      ).toThrow(/Either targetJobDescription or targetRoleKeywords must be provided/);
    });
  });

  describe('RewriteSectionInputSchema', () => {
    it('validates headline rewrite parameters', () => {
      const valid = RewriteSectionInputSchema.parse({
        section: 'headline',
        currentContent: 'Software Engineer at Acme',
        targetRole: 'Staff Engineer',
        focusKeywords: ['Distributed Systems', 'AWS'],
      });
      expect(valid.section).toBe('headline');
      expect(valid.tone).toBe('impactful'); // default
    });

    it('rejects invalid section enum', () => {
      expect(() =>
        RewriteSectionInputSchema.parse({
          section: 'projects' as any,
          currentContent: 'content',
        })
      ).toThrow();
    });
  });

  describe('ExportProfileDiffInputSchema', () => {
    it('accepts current and updated profiles', () => {
      const valid = ExportProfileDiffInputSchema.parse({
        currentProfile: { headline: 'Old Headline' },
        updatedProfile: { headline: 'New Headline' },
      });
      expect(valid.format).toBe('unified'); // default
    });
  });
});
