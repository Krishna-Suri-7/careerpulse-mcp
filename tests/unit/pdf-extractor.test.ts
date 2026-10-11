import { describe, it, expect } from 'vitest';
import {
  sanitizeTextStream,
  extractContactHeuristics,
  segmentDocumentSections,
  parseHeaderBlock,
  parseExperienceBlock,
  parseEducationBlock,
  parseSkillsBlock,
  parseNormalizedText,
  ingestProfileDocument,
} from '../../src/ingestion/pdf-extractor.js';
import { createSyntheticPdfBuffer } from '../testUtils.js';

describe('PDF & Document Extractor (Unit)', () => {
  it('sanitizeTextStream cleans footers, unusual spaces, and breaks', () => {
    const raw = 'Page 1 of 5\r\nJohn\u00A0Doe\r\n\r\n\r\nHeadline\r\nPage 2 of 5';
    const cleaned = sanitizeTextStream(raw);
    expect(cleaned).not.toContain('Page 1 of 5');
    expect(cleaned).not.toContain('Page 2 of 5');
    expect(cleaned).toContain('John Doe\n\nHeadline');
  });

  it('extractContactHeuristics identifies email, phone, and linkedin URL', () => {
    const text = `
      Candidate Profile
      Email: engineer@domain.io
      https://www.linkedin.com/in/cloud-architect
      Phone: +1 415-555-2671
    `;
    const contact = extractContactHeuristics(text);
    expect(contact.email).toBe('engineer@domain.io');
    expect(contact.linkedinUrl).toBe('https://www.linkedin.com/in/cloud-architect');
    expect(contact.phone).toBe('+1 415-555-2671');
  });

  it('segmentDocumentSections divides profile into recognized sections', () => {
    const text = `
Elena Rostova
Lead Systems Engineer
Seattle, WA

Summary
Passionate systems architect with expertise in Go, Kubernetes, and high-throughput networking.

Experience
Google
Staff Software Engineer
Mar 2021 - Present (3 years)
Seattle, WA
• Led distributed networking infrastructure team.
• Scaled edge proxy to handle 500k RPS with sub-10ms latency.

Education
University of Washington
Bachelor of Science, Computer Engineering
2014 - 2018

Skills
Go, Kubernetes, C++, Distributed Systems
`;
    const sections = segmentDocumentSections(text);
    expect(sections['header']).toContain('Elena Rostova');
    expect(sections['summary']).toContain('Passionate systems architect');
    expect(sections['experience']).toContain('Google');
    expect(sections['education']).toContain('University of Washington');
    expect(sections['skills']).toContain('Kubernetes');
  });

  it('parseHeaderBlock extracts name, headline, and multi-part location', () => {
    const header = `
Marcus Vance
Principal Architect | Cloud Native Systems
San Francisco Bay Area
Contact
`;
    const parsed = parseHeaderBlock(header);
    expect(parsed.fullName).toBe('Marcus Vance');
    expect(parsed.headline).toBe('Principal Architect | Cloud Native Systems');
    expect(parsed.location).toBe('San Francisco Bay Area');
  });

  it('parseExperienceBlock parses titles, companies, dates, and bullets', () => {
    const expText = `
Amazon Web Services
Principal Systems Engineer
Jun 2020 - Present
Seattle, WA
• Spearheaded Aurora multi-region replication performance tuning.
• Reduced p99 commit latency by 35% through custom consensus algorithms.
`;
    const exps = parseExperienceBlock(expText);
    expect(exps).toHaveLength(1);
    expect(exps[0].company).toBe('Amazon Web Services');
    expect(exps[0].title).toBe('Principal Systems Engineer');
    expect(exps[0].isCurrent).toBe(true);
    expect(exps[0].bulletPoints).toHaveLength(2);
    expect(exps[0].bulletPoints![0]).toContain('Aurora multi-region');
  });

  it('parseEducationBlock extracts university and degree details', () => {
    const eduText = `
Carnegie Mellon University
Master of Science, Software Engineering
2016 - 2018
`;
    const edu = parseEducationBlock(eduText);
    expect(edu).toHaveLength(1);
    expect(edu[0].school).toBe('Carnegie Mellon University');
    expect(edu[0].degree).toBe('Master of Science');
    expect(edu[0].fieldOfStudy).toBe('Software Engineering');
  });

  it('parseSkillsBlock extracts and deduplicates skills', () => {
    const skillsText = `
TypeScript, Node.js, TypeScript
AWS • Docker • Kubernetes
Docker
`;
    const skills = parseSkillsBlock(skillsText);
    expect(skills).toContain('TypeScript');
    expect(skills).toContain('Node.js');
    expect(skills).toContain('AWS');
    expect(skills).toContain('Docker');
    expect(skills).toContain('Kubernetes');
    expect(skills.filter((s) => s.toLowerCase() === 'typescript')).toHaveLength(1);
  });

  it('parseNormalizedText parses end-to-end raw export string', () => {
    const raw = `
Jane Developer
Staff Engineer | Systems
San Francisco, CA

Summary
Engineering distributed backend architectures. Contact: jane@test.org

Experience
Stripe
Lead Infrastructure Engineer
2021 - Present
• Designed payment settlement pipeline.

Skills
Go, TypeScript, PostgreSQL
`;
    const profile = parseNormalizedText(raw);
    expect(profile.fullName).toBe('Jane Developer');
    expect(profile.headline).toContain('Staff Engineer');
    expect(profile.experiences).toHaveLength(1);
    expect(profile.skills).toContain('Go');
    expect(profile.contactInfo?.email).toBe('jane@test.org');
  });

  it('ingestProfileDocument parses base64 PDF export', async () => {
    const lines = [
      'Dev Ingest',
      'Senior Cloud Architect',
      'Austin, TX',
      'Summary',
      'Cloud platform engineer.',
      'Experience',
      'TechCorp',
      'Senior Engineer',
      '2022 - Present',
      '• Engineered automated deployment pipelines.',
      'Skills',
      'Docker, Kubernetes, AWS',
    ];

    const buf = createSyntheticPdfBuffer(lines);
    const base64 = buf.toString('base64');

    const result = await ingestProfileDocument({ base64 });
    expect(result.sourceType).toBe('pdf');
    expect(result.profile.fullName).toBe('Dev Ingest');
    expect(result.profile.headline).toContain('Senior Cloud Architect');
    expect(result.profile.skills).toContain('Kubernetes');
  });

  it('ingestProfileDocument parses direct rawText input', async () => {
    const rawText = `
Alex Mercer
Tech Lead
Summary
Building web platforms.
Skills
React, TypeScript
`;
    const result = await ingestProfileDocument({ rawText });
    expect(result.sourceType).toBe('text');
    expect(result.profile.fullName).toBe('Alex Mercer');
    expect(result.profile.skills).toContain('React');
  });

  it('ingestProfileDocument throws when file is missing', async () => {
    await expect(
      ingestProfileDocument({ filePath: './non_existent_path_xyz.pdf' })
    ).rejects.toThrow(/Profile document not found at path/);
  });
});
