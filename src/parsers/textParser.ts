import { LinkedInProfile, LinkedInProfileSchema, Experience, Education, Certification } from '../schemas/profile.js';

/**
 * Normalizes text extracted from PDF or raw export
 */
export function cleanRawText(rawText: string): string {
  return rawText
    // Remove Page X of Y footers common in LinkedIn exports
    .replace(/Page\s+\d+\s+of\s+\d+/gi, '')
    // Normalize Windows/Mac line endings
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // Remove excessive consecutive empty lines
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Extracts standard contact information (email, linkedin URL, phone, location)
 */
export function extractContactInfo(text: string): {
  fullName?: string;
  email?: string;
  phone?: string;
  linkedinUrl?: string;
  location?: string;
} {
  const info: {
    fullName?: string;
    email?: string;
    phone?: string;
    linkedinUrl?: string;
    location?: string;
  } = {};

  // Email regex
  const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  if (emailMatch) {
    info.email = emailMatch[0].trim();
  }

  // LinkedIn URL regex
  const linkedinMatch = text.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[a-zA-Z0-9_-]+/i);
  if (linkedinMatch) {
    info.linkedinUrl = linkedinMatch[0].startsWith('http')
      ? linkedinMatch[0]
      : `https://${linkedinMatch[0]}`;
  }

  // Phone regex (e.g. +1 555-555-5555, (555) 555-5555, +44 20 7946 0919)
  const phoneMatch = text.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/);
  if (phoneMatch && phoneMatch[0].replace(/\D/g, '').length >= 7) {
    info.phone = phoneMatch[0].trim();
  }

  return info;
}

/**
 * Splits text into main LinkedIn profile sections
 */
export function splitSections(text: string): Record<string, string> {
  const sections: Record<string, string> = {};
  const cleaned = cleanRawText(text);

  // Common LinkedIn PDF headers
  const headerPatterns = [
    { key: 'summary', regex: /\n\s*(?:Summary|About)\s*\n/i },
    { key: 'experience', regex: /\n\s*(?:Experience|Work Experience)\s*\n/i },
    { key: 'education', regex: /\n\s*(?:Education)\s*\n/i },
    { key: 'skills', regex: /\n\s*(?:Top Skills|Skills & Endorsements|Skills)\s*\n/i },
    { key: 'certifications', regex: /\n\s*(?:Licenses & Certifications|Certifications)\s*\n/i },
    { key: 'languages', regex: /\n\s*(?:Languages)\s*\n/i },
    { key: 'honors', regex: /\n\s*(?:Honors-Awards|Honors & Awards)\s*\n/i },
    { key: 'contact', regex: /\n\s*(?:Contact|Contact Info)\s*\n/i },
  ];

  // Find all section boundaries with start indices
  interface SectionMarker {
    key: string;
    index: number;
    headerLength: number;
  }

  const markers: SectionMarker[] = [];

  for (const hp of headerPatterns) {
    const match = cleaned.match(hp.regex);
    if (match && match.index !== undefined) {
      markers.push({
        key: hp.key,
        index: match.index,
        headerLength: match[0].length,
      });
    }
  }

  // Sort markers by position in document
  markers.sort((a, b) => a.index - b.index);

  // Header/Intro section before the first major section
  if (markers.length > 0) {
    sections['header'] = cleaned.slice(0, markers[0].index).trim();
    for (let i = 0; i < markers.length; i++) {
      const current = markers[i];
      const nextIndex = i + 1 < markers.length ? markers[i + 1].index : cleaned.length;
      const content = cleaned.slice(current.index + current.headerLength, nextIndex).trim();
      sections[current.key] = content;
    }
  } else {
    sections['header'] = cleaned;
  }

  return sections;
}

/**
 * Parses header block to extract Name, Headline, and Location
 */
export function parseHeader(headerText: string): {
  fullName: string;
  headline: string;
  location?: string;
} {
  const lines = headerText
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.toLowerCase().includes('contact') && !l.toLowerCase().includes('page '));

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
    // If line 2 looks like headline and line 3 looks like location
    const potentialLocation = lines[2];
    if (
      potentialLocation.includes(',') ||
      potentialLocation.toLowerCase().includes('area') ||
      potentialLocation.toLowerCase().includes('united') ||
      potentialLocation.toLowerCase().includes('metro')
    ) {
      location = potentialLocation;
    } else {
      // Append to headline if it's a multi-line headline
      headline += ` ${potentialLocation}`;
      if (lines.length >= 4) {
        location = lines[3];
      }
    }
  }

  return { fullName, headline, location };
}

/**
 * Parses the Experience section into structured Experience items
 */
export function parseExperiences(experienceText: string): Experience[] {
  if (!experienceText || experienceText.trim().length === 0) {
    return [];
  }

  const experiences: Experience[] = [];
  const lines = experienceText
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  // A typical entry in LinkedIn PDF export:
  // Company Name
  // Title
  // Dates (e.g. January 2021 - Present (3 years 2 months) or 2020 - 2023)
  // Location
  // Bullet points or description
  //
  // Or:
  // Title
  // Company Name
  // Dates
  const dateRegex =
    /(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{4}|\d{4})\s*[-–—]\s*(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{4}|\d{4}|Present|Current)/i;

  interface RawExpBlock {
    title: string;
    company: string;
    dates?: string;
    location?: string;
    bullets: string[];
    descriptionLines: string[];
  }

  const blocks: RawExpBlock[] = [];
  let currentBlock: RawExpBlock | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const isDateLine = dateRegex.test(line);

    if (isDateLine && i >= 1) {
      // Found a date line! The preceding 1 or 2 lines are Title/Company
      let title = '';
      let company = '';

      if (i >= 2 && lines[i - 2] && !dateRegex.test(lines[i - 2])) {
        // e.g. lines[i-2] is company or title, lines[i-1] is the other
        company = lines[i - 2];
        title = lines[i - 1];
      } else {
        title = lines[i - 1];
        company = 'Unknown Company';
      }

      // If the previous block had swallowed lines[i-1] or lines[i-2] into description, remove them
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
      // Check if bullet point
      const isBullet = /^[•\-*▪–—]\s*/.test(line);
      const cleanBullet = line.replace(/^[•\-*▪–—]\s*/, '').trim();

      if (isBullet) {
        currentBlock.bullets.push(cleanBullet);
      } else {
        // Check if location line right after date line
        if (!currentBlock.location && (line.includes(',') || line.toLowerCase().includes('area'))) {
          currentBlock.location = line;
        } else {
          currentBlock.descriptionLines.push(line);
        }
      }
    }
  }

  // Fallback: If no date lines were matched, create at least one experience from raw text
  if (blocks.length === 0 && lines.length > 0) {
    const title = lines[0] || 'Professional Experience';
    const company = lines.length > 1 ? lines[1] : 'Company';
    const bullets = lines.slice(2).filter((l) => /^[•\-*▪–—]/.test(l)).map((l) => l.replace(/^[•\-*▪–—]\s*/, ''));
    const desc = lines.slice(2).join('\n');
    blocks.push({
      title,
      company,
      bullets,
      descriptionLines: [desc],
    });
  }

  for (const b of blocks) {
    // Parse start and end date
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
          // Strip duration in parentheses like " (2 years 3 mos)"
          endDate = endPart.replace(/\(.*?\)/g, '').trim();
        }
      }
    }

    const description = b.descriptionLines.join('\n').trim();
    // If no explicit bullets were found, split description lines that look like bullet sentences
    let bulletPoints = b.bullets;
    if (bulletPoints.length === 0 && b.descriptionLines.length > 0) {
      bulletPoints = b.descriptionLines.filter((l) => l.length > 15);
    }

    experiences.push({
      title: b.title,
      company: b.company,
      location: b.location,
      startDate,
      endDate,
      isCurrent,
      description,
      bulletPoints,
    });
  }

  return experiences;
}

/**
 * Parses Education section into structured Education items
 */
export function parseEducation(educationText: string): Education[] {
  if (!educationText || educationText.trim().length === 0) {
    return [];
  }

  const education: Education[] = [];
  const lines = educationText
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  // Group items by school: School line, followed by Degree/Field of Study, and Dates
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Check if line looks like dates (e.g. 2016 - 2020 or 2018 – 2022)
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

  // Fallback if no year span detected
  if (education.length === 0 && lines.length > 0) {
    education.push({
      school: lines[0],
      degree: lines.length > 1 ? lines[1] : undefined,
    });
  }

  return education;
}

/**
 * Parses Skills section into an array of skill names
 */
export function parseSkills(skillsText: string): string[] {
  if (!skillsText || skillsText.trim().length === 0) {
    return [];
  }

  const lines = skillsText
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const skills: string[] = [];

  for (const line of lines) {
    // If separated by commas, bullets, or pipes
    if (line.includes(',') || line.includes('•') || line.includes('|')) {
      const split = line.split(/[,•|]/).map((s) => s.trim()).filter((s) => s.length > 0);
      skills.push(...split);
    } else {
      // Single skill per line
      const clean = line.replace(/^[•\-*▪–—]\s*/, '').trim();
      if (clean.length > 0) {
        skills.push(clean);
      }
    }
  }

  // Deduplicate case-insensitively while preserving capitalizations
  const seen = new Set<string>();
  const uniqueSkills: string[] = [];
  for (const s of skills) {
    const lower = s.toLowerCase();
    if (!seen.has(lower) && lower.length > 1) {
      seen.add(lower);
      uniqueSkills.push(s);
    }
  }

  return uniqueSkills;
}

/**
 * Parses Certifications section
 */
export function parseCertifications(certsText: string): Certification[] {
  if (!certsText || certsText.trim().length === 0) {
    return [];
  }

  const lines = certsText
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const certs: Certification[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const isDate = /(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|\d{4})/i.test(line);

    if (isDate && i >= 1) {
      certs.push({
        name: lines[i - 1],
        issueDate: line,
      });
    }
  }

  if (certs.length === 0 && lines.length > 0) {
    for (const line of lines) {
      const clean = line.replace(/^[•\-*▪–—]\s*/, '').trim();
      if (clean.length > 0) {
        certs.push({ name: clean });
      }
    }
  }

  return certs;
}

/**
 * Main parser: takes extracted text from PDF/JSON and returns a validated LinkedInProfile
 */
export function parseLinkedInText(rawText: string): LinkedInProfile {
  const sections = splitSections(rawText);
  const contact = extractContactInfo(rawText);
  const header = parseHeader(sections['header'] || '');

  const fullName = header.fullName || contact.fullName || '';
  const headline = header.headline || '';
  const summary = sections['summary'] || '';

  const experiences = parseExperiences(sections['experience'] || '');
  const education = parseEducation(sections['education'] || '');
  const skills = parseSkills(sections['skills'] || '');
  const certifications = parseCertifications(sections['certifications'] || '');

  const profileData: LinkedInProfile = {
    fullName,
    headline,
    summary,
    experiences,
    skills,
    education,
    certifications,
    contactInfo: {
      fullName,
      email: contact.email,
      phone: contact.phone,
      linkedinUrl: contact.linkedinUrl,
      location: header.location || contact.location,
    },
  };

  return LinkedInProfileSchema.parse(profileData);
}
