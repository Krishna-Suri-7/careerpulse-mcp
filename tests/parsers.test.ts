import { describe, it, expect } from 'vitest';
import {
  cleanRawText,
  extractContactInfo,
  splitSections,
  parseHeader,
  parseExperiences,
  parseEducation,
  parseSkills,
  parseLinkedInText,
} from '../src/parsers/textParser.js';
import { parseLinkedInPdf, parseLinkedInJson } from '../src/parsers/pdfParser.js';
import { createSyntheticPdfBuffer } from './testUtils.js';

describe('Text Parser', () => {
  it('cleanRawText removes page footers and normalizes line endings', () => {
    const raw = 'Page 1 of 3\r\nName\r\n\r\n\r\nHeadline\r\nPage 2 of 3';
    const cleaned = cleanRawText(raw);
    expect(cleaned).not.toContain('Page 1 of 3');
    expect(cleaned).not.toContain('Page 2 of 3');
    expect(cleaned).toContain('Name\n\nHeadline');
  });

  it('extractContactInfo extracts email, linkedin URL, phone', () => {
    const text = `
      John Doe
      Contact: john.doe@example.com
      https://www.linkedin.com/in/johndoe
      Phone: +1 555-123-4567
    `;
    const contact = extractContactInfo(text);
    expect(contact.email).toBe('john.doe@example.com');
    expect(contact.linkedinUrl).toBe('https://www.linkedin.com/in/johndoe');
    expect(contact.phone).toBe('+1 555-123-4567');
  });

  it('splitSections correctly segments text by section headers', () => {
    const fullText = `
John Doe
Senior Engineer
Greater Seattle Area

Summary
Passionate engineer building cloud infrastructure.

Experience
Acme Corp
Senior Software Engineer
Jan 2020 - Present
Seattle, WA
- Built distributed streaming pipeline.

Education
University of Washington
B.S., Computer Science
2014 - 2018

Skills
TypeScript
Go
Kubernetes
`;
    const sections = splitSections(fullText);
    expect(sections['header']).toContain('John Doe');
    expect(sections['summary']).toContain('Passionate engineer');
    expect(sections['experience']).toContain('Acme Corp');
    expect(sections['education']).toContain('University of Washington');
    expect(sections['skills']).toContain('TypeScript');
  });

  it('parseExperiences parses roles, companies, dates, and bullet points', () => {
    const expText = `
Stripe
Staff Software Engineer
Feb 2021 - Present (3 years)
San Francisco, CA
• Designed real-time payment idempotency layer.
• Scaled ledger service to process 50,000 TPS.
`;
    const experiences = parseExperiences(expText);
    expect(experiences).toHaveLength(1);
    expect(experiences[0].company).toBe('Stripe');
    expect(experiences[0].title).toBe('Staff Software Engineer');
    expect(experiences[0].isCurrent).toBe(true);
    expect(experiences[0].bulletPoints).toHaveLength(2);
    expect(experiences[0].bulletPoints![0]).toContain('Designed real-time payment idempotency layer.');
  });

  it('parseEducation extracts school, degree, and field of study', () => {
    const eduText = `
Stanford University
Master of Science, Artificial Intelligence
2018 - 2020
`;
    const education = parseEducation(eduText);
    expect(education).toHaveLength(1);
    expect(education[0].school).toBe('Stanford University');
    expect(education[0].degree).toBe('Master of Science');
    expect(education[0].fieldOfStudy).toBe('Artificial Intelligence');
  });

  it('parseSkills parses skills from lines and comma separated tokens', () => {
    const skillsText = `
TypeScript, Python, Go
Docker
Kubernetes • AWS • Terraform
`;
    const skills = parseSkills(skillsText);
    expect(skills).toContain('TypeScript');
    expect(skills).toContain('Python');
    expect(skills).toContain('Docker');
    expect(skills).toContain('Kubernetes');
    expect(skills).toContain('AWS');
  });

  it('parseLinkedInText end-to-end creates validated LinkedInProfile', () => {
    const fullText = `
Sarah Connor
Principal Systems Architect
Austin, Texas, United States

Summary
Architecting resilient enterprise systems with a focus on high throughput and low latency.
Contact: sarah@example.com

Experience
Cyberdyne Systems
Chief Architect
Jan 2022 - Present
Austin, TX
• Architected multi-region failover cluster reducing RTO to under 15 seconds.
• Automated deployment pipelines cutting delivery cycle by 50%.

Education
MIT
Bachelor of Science, Electrical Engineering & Computer Science
2012 - 2016

Skills
System Architecture
Go
PostgreSQL
Kubernetes
`;
    const profile = parseLinkedInText(fullText);
    expect(profile.fullName).toBe('Sarah Connor');
    expect(profile.headline).toContain('Principal Systems Architect');
    expect(profile.summary).toContain('Architecting resilient');
    expect(profile.experiences).toHaveLength(1);
    expect(profile.experiences[0].title).toBe('Chief Architect');
    expect(profile.skills).toContain('System Architecture');
    expect(profile.education[0].school).toBe('MIT');
  });
});

describe('PDF and JSON Parsers', () => {
  it('parseLinkedInJson parses valid JSON representation', () => {
    const jsonStr = JSON.stringify({
      fullName: 'Dev User',
      headline: 'Full-Stack Developer',
      skills: ['React', 'Node.js'],
    });
    const profile = parseLinkedInJson(jsonStr);
    expect(profile.fullName).toBe('Dev User');
    expect(profile.skills).toEqual(['React', 'Node.js']);
  });

  it('parseLinkedInPdf parses synthetic base64 PDF', async () => {
    const pdfLines = [
      'Dev User',
      'Lead Engineer',
      'Seattle, WA',
      'Summary',
      'Building scalable cloud backends.',
      'Experience',
      'CloudCorp',
      'Lead Engineer',
      '2021 - Present',
      '• Built event pipeline handling 1M events/sec.',
      'Skills',
      'Node.js',
      'TypeScript',
      'Docker',
    ];

    const buffer = createSyntheticPdfBuffer(pdfLines);
    const base64 = buffer.toString('base64');

    const result = await parseLinkedInPdf({ base64 });
    expect(result.numPages).toBeGreaterThanOrEqual(1);
    expect(result.profile.fullName).toBe('Dev User');
    expect(result.profile.headline).toContain('Lead Engineer');
    expect(result.profile.skills).toContain('Node.js');
  });

  it('parseLinkedInPdf throws clear error on missing file', async () => {
    await expect(
      parseLinkedInPdf({ filePath: './non-existent-profile-file-12345.pdf' })
    ).rejects.toThrow(/PDF file not found at path/);
  });
});
