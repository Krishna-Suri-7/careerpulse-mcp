import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import pdfParse from 'pdf-parse';
import {
  NormalizedProfile,
  NormalizedProfileSchema,
  NormalizedExperience,
  NormalizedEducation,
  NormalizedCertification,
  NormalizedContactInfo,
  IngestProfileDocumentInput,
} from '../contracts/profile-schema.js';

export interface IngestionResult {
  profile: NormalizedProfile;
  numPages: number;
  rawText: string;
  sourceType: 'pdf' | 'json' | 'text';
}

/**
 * Normalizes raw text extracted from PDF or export file
 */
export function sanitizeTextStream(rawText: string): string {
  return rawText
    // Remove Page X of Y footers commonly stamped on LinkedIn exports
    .replace(/Page\s+\d+\s+of\s+\d+/gi, '')
    // Normalize line endings
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // Remove non-breaking spaces and weird control characters
    .replace(/[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g, ' ')
    // Collapse excessive empty lines
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Extracts standard contact information using regular expressions
 */
export function extractContactHeuristics(text: string): NormalizedContactInfo {
  const contact: NormalizedContactInfo = {
    fullName: '',
    email: undefined,
    phone: undefined,
    location: undefined,
    linkedinUrl: undefined,
    portfolioUrl: undefined,
    websites: [],
  };

  // Email pattern
  const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  if (emailMatch) {
    contact.email = emailMatch[0].trim();
  }

  // LinkedIn URL pattern
  const linkedinMatch = text.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[a-zA-Z0-9_-]+/i);
  if (linkedinMatch) {
    contact.linkedinUrl = linkedinMatch[0].startsWith('http')
      ? linkedinMatch[0]
      : `https://${linkedinMatch[0]}`;
  }

  // Phone pattern
  const phoneMatch = text.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/);
  if (phoneMatch && phoneMatch[0].replace(/\D/g, '').length >= 7) {
    contact.phone = phoneMatch[0].trim();
  }

  return contact;
}

/**
 * Splits document text into discrete LinkedIn sections based on heading delimiters
 */
export function segmentDocumentSections(text: string): Record<string, string> {
  const sections: Record<string, string> = {};
  const cleaned = sanitizeTextStream(text);

  const headerDelimiters = [
    { key: 'summary', regex: /\n\s*(?:Summary|About|Professional Summary)\s*\n/i },
    { key: 'experience', regex: /\n\s*(?:Experience|Work Experience|Employment History)\s*\n/i },
    { key: 'education', regex: /\n\s*(?:Education|Academic Background)\s*\n/i },
    { key: 'skills', regex: /\n\s*(?:Top Skills|Skills & Endorsements|Skills|Core Competencies)\s*\n/i },
    { key: 'certifications', regex: /\n\s*(?:Licenses & Certifications|Certifications|Credentials)\s*\n/i },
    { key: 'languages', regex: /\n\s*(?:Languages)\s*\n/i },
    { key: 'honors', regex: /\n\s*(?:Honors-Awards|Honors & Awards)\s*\n/i },
    { key: 'contact', regex: /\n\s*(?:Contact|Contact Info)\s*\n/i },
  ];

  interface DelimiterMatch {
    key: string;
    index: number;
    length: number;
  }

  const matches: DelimiterMatch[] = [];

  for (const delimiter of headerDelimiters) {
    const match = cleaned.match(delimiter.regex);
    if (match && match.index !== undefined) {
      matches.push({
        key: delimiter.key,
        index: match.index,
        length: match[0].length,
      });
    }
  }

  matches.sort((a, b) => a.index - b.index);

  if (matches.length > 0) {
    sections['header'] = cleaned.slice(0, matches[0].index).trim();
    for (let i = 0; i < matches.length; i++) {
      const cur = matches[i];
      const nextIdx = i + 1 < matches.length ? matches[i + 1].index : cleaned.length;
      sections[cur.key] = cleaned.slice(cur.index + cur.length, nextIdx).trim();
    }
  } else {
    sections['header'] = cleaned;
  }

  return sections;
}

/**
 * Extracts Full Name, Headline, and Location from top document header block
 */
export function parseHeaderBlock(headerText: string): {
  fullName: string;
  headline: string;
  location?: string;
} {
  const lines = headerText
    .split('\n')
    .map((l) => l.trim())
    .filter(
      (l) =>
        l.length > 0 &&
        !l.toLowerCase().includes('contact') &&
        !l.toLowerCase().includes('page ')
    );

  if (lines.length === 0) {
    return { fullName: '', headline: '' };
  }

  const fullName = lines[0] || '';
  let headline = '';
  let location: string | undefined = undefined;

  if (lines.length >= 2) {
    headline = lines[1];
  }

  if (lines.length >= 3) {
    const candidateLocation = lines[2];
    if (
      candidateLocation.includes(',') ||
      candidateLocation.toLowerCase().includes('area') ||
      candidateLocation.toLowerCase().includes('united') ||
      candidateLocation.toLowerCase().includes('metro')
    ) {
      location = candidateLocation;
    } else {
      headline += ` ${candidateLocation}`;
      if (lines.length >= 4) {
        location = lines[3];
      }
    }
  }

  return { fullName, headline, location };
}

/**
 * Parses Work Experience section with fault-tolerant date and role extraction
 */
export function parseExperienceBlock(experienceText: string): NormalizedExperience[] {
  if (!experienceText || experienceText.trim().length === 0) {
    return [];
  }

  const lines = experienceText
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const dateRegex =
    /(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{4}|\d{4})\s*[-–—]\s*(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{4}|\d{4}|Present|Current)/i;

  interface RawBlock {
    title: string;
    company: string;
    dates?: string;
    location?: string;
    bullets: string[];
    descriptionLines: string[];
  }

  const blocks: RawBlock[] = [];
  let currentBlock: RawBlock | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const isDateLine = dateRegex.test(line);

    if (isDateLine && i >= 1) {
      let title = '';
      let company = '';

      if (i >= 2 && lines[i - 2] && !dateRegex.test(lines[i - 2])) {
        company = lines[i - 2];
        title = lines[i - 1];
      } else {
        title = lines[i - 1];
        company = 'Company';
      }

      if (currentBlock) {
        currentBlock.descriptionLines = currentBlock.descriptionLines.filter(
          (l) => l !== company && l !== title
        );
        currentBlock.bullets = currentBlock.bullets.filter(
          (l) => l !== company && l !== title
        );
      }

      currentBlock = {
        title,
        company,
        dates: line,
        bullets: [],
        descriptionLines: [],
      };
      blocks.push(currentBlock);
      continue;
    }

    if (currentBlock) {
      const isBullet = /^[•\-*▪–—]\s*/.test(line);
      const cleanBullet = line.replace(/^[•\-*▪–—]\s*/, '').trim();

      if (isBullet) {
        currentBlock.bullets.push(cleanBullet);
      } else if (!currentBlock.location && (line.includes(',') || line.toLowerCase().includes('area'))) {
        currentBlock.location = line;
      } else {
        currentBlock.descriptionLines.push(line);
      }
    }
  }

  // Fallback if no dates matched
  if (blocks.length === 0 && lines.length > 0) {
    const title = lines[0] || 'Professional Experience';
    const company = lines.length > 1 ? lines[1] : 'Company';
    const bullets = lines
      .slice(2)
      .filter((l) => /^[•\-*▪–—]/.test(l))
      .map((l) => l.replace(/^[•\-*▪–—]\s*/, ''));
    const desc = lines.slice(2).join('\n');
    blocks.push({
      title,
      company,
      bullets,
      descriptionLines: [desc],
    });
  }

  return blocks.map((b) => {
    let startDate: string | undefined = undefined;
    let endDate: string | undefined = undefined;
    let isCurrent = false;

    if (b.dates) {
      const parts = b.dates.split(/[-–—]/);
      if (parts[0]) startDate = parts[0].trim();
      if (parts[1]) {
        const endPart = parts[1].trim();
        if (/present|current/i.test(endPart)) {
          isCurrent = true;
          endDate = 'Present';
        } else {
          endDate = endPart.replace(/\(.*?\)/g, '').trim();
        }
      }
    }

    let bulletPoints = b.bullets;
    if (bulletPoints.length === 0 && b.descriptionLines.length > 0) {
      bulletPoints = b.descriptionLines.filter((l) => l.length > 15);
    }

    return {
      title: b.title,
      company: b.company,
      location: b.location,
      startDate,
      endDate,
      isCurrent,
      description: b.descriptionLines.join('\n').trim(),
      bulletPoints,
    };
  });
}

/**
 * Parses Education section into structured records
 */
export function parseEducationBlock(educationText: string): NormalizedEducation[] {
  if (!educationText || educationText.trim().length === 0) {
    return [];
  }

  const lines = educationText
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const education: NormalizedEducation[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const isYearSpan = /\d{4}\s*[-–—]\s*\d{4}/.test(line);

    if (isYearSpan && i >= 1) {
      const dates = line.match(/\d{4}\s*[-–—]\s*\d{4}/)?.[0];
      const [start, end] = dates ? dates.split(/[-–—]/).map((d) => d.trim()) : [undefined, undefined];

      let school = '';
      let degree = '';
      let fieldOfStudy = '';

      if (i >= 2) {
        school = lines[i - 2];
        const degLine = lines[i - 1];
        if (degLine.includes(',')) {
          const parts = degLine.split(',');
          degree = parts[0].trim();
          fieldOfStudy = parts.slice(1).join(',').trim();
        } else {
          degree = degLine;
        }
      } else {
        school = lines[i - 1];
      }

      education.push({
        school,
        degree: degree || undefined,
        fieldOfStudy: fieldOfStudy || undefined,
        startDate: start,
        endDate: end,
      });
    }
  }

  if (education.length === 0 && lines.length > 0) {
    education.push({
      school: lines[0],
      degree: lines.length > 1 ? lines[1] : undefined,
    });
  }

  return education;
}

/**
 * Parses Skills list into deduplicated strings
 */
export function parseSkillsBlock(skillsText: string): string[] {
  if (!skillsText || skillsText.trim().length === 0) {
    return [];
  }

  const lines = skillsText
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const rawSkills: string[] = [];

  for (const line of lines) {
    if (line.includes(',') || line.includes('•') || line.includes('|')) {
      const split = line.split(/[,•|]/).map((s) => s.trim()).filter((s) => s.length > 0);
      rawSkills.push(...split);
    } else {
      const clean = line.replace(/^[•\-*▪–—]\s*/, '').trim();
      if (clean.length > 0) {
        rawSkills.push(clean);
      }
    }
  }

  const seen = new Set<string>();
  const uniqueSkills: string[] = [];
  for (const s of rawSkills) {
    const lower = s.toLowerCase();
    if (!seen.has(lower) && lower.length > 1) {
      seen.add(lower);
      uniqueSkills.push(s);
    }
  }

  return uniqueSkills;
}

/**
 * Pure function: Ingests raw LinkedIn export text and returns validated NormalizedProfile
 */
export function parseNormalizedText(rawText: string): NormalizedProfile {
  const sections = segmentDocumentSections(rawText);
  const contact = extractContactHeuristics(rawText);
  const header = parseHeaderBlock(sections['header'] || '');

  const fullName = header.fullName || contact.fullName || '';
  const headline = header.headline || '';
  const summary = sections['summary'] || '';

  const experiences = parseExperienceBlock(sections['experience'] || '');
  const education = parseEducationBlock(sections['education'] || '');
  const skills = parseSkillsBlock(sections['skills'] || '');

  const profileData: NormalizedProfile = {
    fullName,
    headline,
    summary,
    experiences,
    skills,
    education,
    certifications: [],
    contactInfo: {
      fullName,
      email: contact.email,
      phone: contact.phone,
      linkedinUrl: contact.linkedinUrl,
      location: header.location || contact.location,
      websites: [],
    },
  };

  return NormalizedProfileSchema.parse(profileData);
}

/**
 * High-performance, fault-tolerant document ingestion function
 */
export async function ingestProfileDocument(
  input: IngestProfileDocumentInput
): Promise<IngestionResult> {
  // 1. Direct raw text provided
  if (input.rawText) {
    const profile = parseNormalizedText(input.rawText);
    return {
      profile,
      numPages: 1,
      rawText: input.rawText,
      sourceType: 'text',
    };
  }

  let buffer: Buffer;

  // 2. Read from filePath or base64
  if (input.filePath) {
    const resolved = path.resolve(input.filePath);
    if (!existsSync(resolved)) {
      throw new Error(`Profile document not found at path: ${input.filePath}`);
    }

    // Check if JSON file
    if (input.filePath.endsWith('.json') || input.format === 'json') {
      const jsonContent = await fs.readFile(resolved, 'utf-8');
      const parsedJson = JSON.parse(jsonContent);
      const profile = NormalizedProfileSchema.parse(parsedJson);
      return {
        profile,
        numPages: 1,
        rawText: jsonContent,
        sourceType: 'json',
      };
    }

    buffer = await fs.readFile(resolved);
  } else if (input.base64) {
    const clean = input.base64.replace(/^data:(?:application\/pdf|text\/json);base64,/, '');
    buffer = Buffer.from(clean, 'base64');
  } else {
    throw new Error('No valid document input provided');
  }

  if (buffer.length === 0) {
    throw new Error('Input document buffer is empty');
  }

  // Check if buffer starts with JSON
  const trimmedString = buffer.slice(0, 100).toString('utf-8').trim();
  if (trimmedString.startsWith('{') || input.format === 'json') {
    try {
      const parsed = JSON.parse(buffer.toString('utf-8'));
      const profile = NormalizedProfileSchema.parse(parsed);
      return {
        profile,
        numPages: 1,
        rawText: buffer.toString('utf-8'),
        sourceType: 'json',
      };
    } catch {
      // Fall through to PDF parse if not valid JSON
    }
  }

  // 3. Parse PDF with pdf-parse
  const uint8Array = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  const pdfResult = await pdfParse(uint8Array as unknown as Buffer);
  const rawText = pdfResult.text || '';
  const numPages = pdfResult.numpages || 1;

  if (rawText.trim().length === 0) {
    throw new Error('PDF document contains no extractable text stream');
  }

  const profile = parseNormalizedText(rawText);

  return {
    profile,
    numPages,
    rawText,
    sourceType: 'pdf',
  };
}
