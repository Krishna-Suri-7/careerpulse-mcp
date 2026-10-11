import { describe, it, expect } from 'vitest';
import {
  tokenizeWords,
  extractNGrams,
  extractTargetKeywords,
  searchKeywordInProfile,
  analyzeKeywordGapEngine,
  HARD_SKILLS_DICTIONARY,
  SOFT_SKILLS_DICTIONARY,
} from '../../src/analytics/keyword-analyzer.js';
import { NormalizedProfile } from '../../src/contracts/profile-schema.js';

describe('Keyword Analyzer & N-Gram Engine (Unit)', () => {
  describe('tokenizeWords', () => {
    it('filters stop words and returns cleaned lowercase tokens in O(n)', () => {
      const text = 'We are seeking an experienced engineer with strong ability in TypeScript and AWS.';
      const tokens = tokenizeWords(text);

      expect(tokens).toContain('seeking');
      expect(tokens).toContain('engineer');
      expect(tokens).toContain('strong');
      expect(tokens).toContain('typescript');
      expect(tokens).toContain('aws');
      expect(tokens).not.toContain('we');
      expect(tokens).not.toContain('are');
      expect(tokens).not.toContain('an');
      expect(tokens).not.toContain('with');
    });

    it('handles special symbols in technical terms (#, +, .)', () => {
      const text = 'Experience with C++, C#, and Node.js';
      const tokens = tokenizeWords(text);
      expect(tokens).toContain('c++');
      expect(tokens).toContain('c#');
      expect(tokens).toContain('node.js');
    });
  });

  describe('extractNGrams', () => {
    it('extracts unigrams, bigrams, and trigrams up to maxN', () => {
      const words = ['event', 'driven', 'architecture', 'design'];
      const ngrams = extractNGrams(words, 3);

      expect(ngrams).toContain('event');
      expect(ngrams).toContain('event driven');
      expect(ngrams).toContain('event driven architecture');
      expect(ngrams).toContain('driven architecture design');
      expect(ngrams).not.toContain('event driven architecture design'); // max 3
    });

    it('handles single word inputs without crashing', () => {
      const ngrams = extractNGrams(['typescript'], 3);
      expect(ngrams).toEqual(['typescript']);
    });
  });

  describe('extractTargetKeywords', () => {
    it('identifies hard and soft skills from job descriptions', () => {
      const jd = `
        We are hiring a Senior Distributed Systems Engineer.
        Must have:
        - Deep experience with Go, Kubernetes, and PostgreSQL.
        - Knowledge of Apache Kafka and microservices.
        - Proven track record of cross-functional collaboration and technical leadership.
        - Proficiency in GraphQL and Docker.
      `;

      const result = extractTargetKeywords(jd, 3);

      expect(result.hardSkills).toContain('Go');
      expect(result.hardSkills).toContain('Kubernetes');
      expect(result.hardSkills).toContain('PostgreSQL');
      expect(result.hardSkills).toContain('Apache Kafka');
      expect(result.hardSkills).toContain('Microservices');
      expect(result.hardSkills).toContain('GraphQL');
      expect(result.hardSkills).toContain('Docker');

      expect(result.softSkills).toContain('Cross-Functional Collaboration');
      expect(result.softSkills).toContain('Technical Leadership');
    });
  });

  describe('searchKeywordInProfile', () => {
    const profile: NormalizedProfile = {
      fullName: 'Marcus Vance',
      headline: 'Principal Engineer | Distributed Systems & High Concurrency',
      summary: 'Passionate about system architecture, performance optimization, and cross-functional leadership.',
      experiences: [
        {
          title: 'Staff Engineer',
          company: 'Acme',
          bulletPoints: [
            'Engineered resilient Kafka event streams with Go and PostgreSQL.',
            'Mentored 8 senior developers and championed quarterly design reviews.',
            'Collaborated with product teams to define API contracts.',
          ],
        },
      ],
      skills: ['Go', 'PostgreSQL', 'Docker', 'Kubernetes'],
      education: [
        {
          school: 'Stanford',
          degree: 'Master of Science',
          fieldOfStudy: 'Computer Science',
        },
      ],
      certifications: [],
      contactInfo: { websites: [] },
    };

    it('finds keywords across headline, summary, experiences, skills, and education', () => {
      const goSearch = searchKeywordInProfile('Go', profile);
      expect(goSearch.found).toBe(true);
      expect(goSearch.locations).toContain('experience');
      expect(goSearch.locations).toContain('skills');

      const headlineSearch = searchKeywordInProfile('Distributed Systems', profile);
      expect(headlineSearch.found).toBe(true);
      expect(headlineSearch.locations).toContain('headline');

      const eduSearch = searchKeywordInProfile('Computer Science', profile);
      expect(eduSearch.found).toBe(true);
      expect(eduSearch.locations).toContain('education');
    });

    it('matches morphological variants and verb stems (Mentorship -> Mentored, Collaboration -> Collaborated)', () => {
      const mentorSearch = searchKeywordInProfile('Mentorship', profile);
      expect(mentorSearch.found).toBe(true);
      expect(mentorSearch.locations).toContain('experience');

      const collabSearch = searchKeywordInProfile('Collaboration', profile);
      expect(collabSearch.found).toBe(true);
      expect(collabSearch.locations).toContain('experience');
    });

    it('returns found: false when keyword is absent', () => {
      const rustSearch = searchKeywordInProfile('Rust', profile);
      expect(rustSearch.found).toBe(false);
      expect(rustSearch.locations).toEqual([]);
      expect(rustSearch.frequency).toBe(0);
    });
  });

  describe('analyzeKeywordGapEngine (End-to-End Gap Identification)', () => {
    const profile: NormalizedProfile = {
      fullName: 'Dev Lead',
      headline: 'Senior Full Stack Engineer | React & Node.js',
      summary: 'Building high-scale web platforms with TypeScript, React, and PostgreSQL.',
      experiences: [
        {
          title: 'Senior Software Engineer',
          company: 'SaaS Inc',
          bulletPoints: [
            'Engineered microservices using Node.js and PostgreSQL.',
            'Led sprint planning and mentored junior engineers.',
          ],
        },
      ],
      skills: ['TypeScript', 'React', 'Node.js', 'PostgreSQL', 'Git'],
      education: [],
      certifications: [],
      contactInfo: { websites: [] },
    };

    it('evaluates gap against target job description and suggests placement', () => {
      const jd = `
        Senior Staff Engineer Requirements:
        - 5+ years with TypeScript, Node.js, React, and PostgreSQL.
        - Strong expertise in Kubernetes, Docker, and AWS.
        - Experience with Apache Kafka and distributed systems.
        - Proven cross-functional collaboration and technical leadership.
      `;

      const report = analyzeKeywordGapEngine(profile, {
        targetJobDescription: jd,
        targetRoleTitle: 'Senior Staff Engineer',
      });

      // Matched hard skills
      expect(report.hardSkills.matched).toContain('TypeScript');
      expect(report.hardSkills.matched).toContain('Node.js');
      expect(report.hardSkills.matched).toContain('React');
      expect(report.hardSkills.matched).toContain('PostgreSQL');

      // Missing hard skills
      expect(report.hardSkills.missing).toContain('Kubernetes');
      expect(report.hardSkills.missing).toContain('Docker');
      expect(report.hardSkills.missing).toContain('AWS');
      expect(report.hardSkills.missing).toContain('Apache Kafka');

      // Soft skills
      expect(report.softSkills.missing).toContain('Cross-Functional Collaboration');

      // Score
      expect(report.matchScore).toBeGreaterThan(0);
      expect(report.matchScore).toBeLessThan(100);

      // Strategic placements
      expect(report.strategicPlacements.headline.some((h) => h.includes('Senior Staff Engineer'))).toBe(true);
      expect(report.strategicPlacements.skills.length).toBeGreaterThan(0);
      expect(report.strategicPlacements.experience.length).toBeGreaterThan(0);
    });

    it('evaluates gap against explicit targetRoleKeywords array', () => {
      const report = analyzeKeywordGapEngine(profile, {
        targetRoleKeywords: ['TypeScript', 'Kubernetes', 'Go', 'Mentorship'],
      });

      expect(report.hardSkills.matched).toContain('TypeScript');
      expect(report.hardSkills.missing).toContain('Kubernetes');
      expect(report.hardSkills.missing).toContain('Go');
      expect(report.softSkills.matched).toContain('Mentorship');
    });
  });
});
