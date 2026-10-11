import { NormalizedProfile } from '../contracts/profile-schema.js';

export interface KeywordEntry {
  keyword: string;
  category: 'hard' | 'soft';
  found: boolean;
  locations: ('headline' | 'summary' | 'experience' | 'skills' | 'education')[];
  frequency: number;
  placementRecommendation?: string;
}

export interface KeywordAnalysisReport {
  matchScore: number; // 0-100 percentage
  totalIdentified: number;
  matchedCount: number;
  missingCount: number;
  hardSkills: {
    matched: string[];
    missing: string[];
  };
  softSkills: {
    matched: string[];
    missing: string[];
  };
  details: KeywordEntry[];
  strategicPlacements: {
    headline: string[];
    summary: string[];
    experience: string[];
    skills: string[];
  };
}

// Canonical Technical / Hard Skills Dictionary
export const HARD_SKILLS_DICTIONARY: Record<string, string> = {
  // Programming & Scripting
  typescript: 'TypeScript',
  javascript: 'JavaScript',
  python: 'Python',
  java: 'Java',
  golang: 'Go',
  go: 'Go',
  rust: 'Rust',
  'c++': 'C++',
  'c#': 'C#',
  ruby: 'Ruby',
  php: 'PHP',
  swift: 'Swift',
  kotlin: 'Kotlin',
  sql: 'SQL',
  bash: 'Bash',
  shell: 'Shell',
  html: 'HTML5',
  css: 'CSS3',

  // Frontend & Mobile
  react: 'React',
  'next.js': 'Next.js',
  nextjs: 'Next.js',
  vue: 'Vue.js',
  'vue.js': 'Vue.js',
  angular: 'Angular',
  svelte: 'Svelte',
  redux: 'Redux',
  tailwind: 'Tailwind CSS',
  'tailwind css': 'Tailwind CSS',
  webpack: 'Webpack',
  vite: 'Vite',
  graphql: 'GraphQL',
  'react native': 'React Native',
  flutter: 'Flutter',

  // Backend & Systems
  'node.js': 'Node.js',
  nodejs: 'Node.js',
  express: 'Express.js',
  fastify: 'Fastify',
  nestjs: 'NestJS',
  django: 'Django',
  flask: 'Flask',
  fastapi: 'FastAPI',
  'spring boot': 'Spring Boot',
  grpc: 'gRPC',
  rest: 'REST APIs',
  'rest api': 'REST APIs',
  'restful api': 'RESTful APIs',
  websockets: 'WebSockets',
  microservices: 'Microservices',

  // Databases & Storage
  postgresql: 'PostgreSQL',
  postgres: 'PostgreSQL',
  mysql: 'MySQL',
  sqlite: 'SQLite',
  mongodb: 'MongoDB',
  redis: 'Redis',
  dynamodb: 'DynamoDB',
  cassandra: 'Cassandra',
  kafka: 'Apache Kafka',
  rabbitmq: 'RabbitMQ',
  elasticsearch: 'Elasticsearch',
  snowflake: 'Snowflake',
  bigquery: 'BigQuery',

  // Cloud & Infrastructure
  aws: 'AWS',
  azure: 'Azure',
  gcp: 'Google Cloud (GCP)',
  'google cloud': 'Google Cloud (GCP)',
  docker: 'Docker',
  kubernetes: 'Kubernetes',
  k8s: 'Kubernetes',
  terraform: 'Terraform',
  ansible: 'Ansible',
  'ci/cd': 'CI/CD',
  'github actions': 'GitHub Actions',
  gitlab: 'GitLab CI',
  linux: 'Linux',
  serverless: 'Serverless',
  lambda: 'AWS Lambda',

  // Architecture & Engineering Practices
  'system design': 'System Design',
  'distributed systems': 'Distributed Systems',
  'event-driven architecture': 'Event-Driven Architecture',
  'domain-driven design': 'Domain-Driven Design (DDD)',
  scalability: 'High Scalability',
  'performance optimization': 'Performance Optimization',

  // AI & Data Science
  'machine learning': 'Machine Learning',
  'deep learning': 'Deep Learning',
  pytorch: 'PyTorch',
  tensorflow: 'TensorFlow',
  nlp: 'Natural Language Processing (NLP)',
  llm: 'Large Language Models (LLMs)',
  llms: 'Large Language Models (LLMs)',
  'generative ai': 'Generative AI',
  pandas: 'Pandas',
  numpy: 'NumPy',
  'data pipelines': 'Data Pipelines',
  etl: 'ETL Pipelines',

  // Testing & Security
  'unit testing': 'Unit Testing',
  vitest: 'Vitest',
  jest: 'Jest',
  cypress: 'Cypress',
  playwright: 'Playwright',
  oauth: 'OAuth 2.0',
  jwt: 'JWT',
  cybersecurity: 'Cybersecurity',
  owasp: 'OWASP Security',
};

// Canonical Soft Skills & Leadership Dictionary
export const SOFT_SKILLS_DICTIONARY: Record<string, string> = {
  leadership: 'Technical Leadership',
  'cross-functional collaboration': 'Cross-Functional Collaboration',
  collaboration: 'Collaboration',
  agile: 'Agile Methodology',
  scrum: 'Scrum',
  kanban: 'Kanban',
  mentorship: 'Mentorship',
  mentoring: 'Mentorship',
  'stakeholder management': 'Stakeholder Management',
  'strategic planning': 'Strategic Planning',
  'product strategy': 'Product Strategy',
  'project management': 'Project Management',
  'code review': 'Code Reviews',
  'code reviews': 'Code Reviews',
  'problem solving': 'Problem Solving',
  communication: 'Technical Communication',
  'root cause analysis': 'Root Cause Analysis',
  'continuous improvement': 'Continuous Improvement',
  adaptability: 'Adaptability',
  'team building': 'Team Building',
  negotiation: 'Stakeholder Negotiation',
  'conflict resolution': 'Conflict Resolution',
  'technical writing': 'Technical Documentation',
  ownership: 'End-to-End Ownership',
};

// Standard English stop-words to exclude from n-gram candidate generation
const STOP_WORDS: ReadonlySet<string> = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'aren',
  'as', 'at', 'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by',
  'can', 'could', 'did', 'do', 'does', 'doing', 'down', 'during', 'each', 'few', 'for', 'from',
  'further', 'had', 'has', 'have', 'having', 'he', 'her', 'here', 'hers', 'herself', 'him', 'himself',
  'his', 'how', 'i', 'if', 'in', 'into', 'is', 'it', 'its', 'itself', 'just', 'me', 'more', 'most',
  'my', 'myself', 'no', 'nor', 'not', 'now', 'of', 'off', 'on', 'once', 'only', 'or', 'other',
  'our', 'ours', 'ourselves', 'out', 'over', 'own', 'same', 'she', 'should', 'so', 'some', 'such',
  'than', 'that', 'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there', 'these', 'they',
  'this', 'those', 'through', 'to', 'too', 'under', 'until', 'up', 'very', 'was', 'we', 'were',
  'what', 'when', 'where', 'which', 'while', 'who', 'whom', 'why', 'with', 'would', 'you', 'your',
  'yours', 'yourself', 'yourselves', 'required', 'requirements', 'responsibilities', 'preferred',
  'plus', 'candidate', 'candidates', 'experience', 'years', 'working', 'ability', 'role', 'team',
]);

/**
 * Pure function: Tokenizes text into cleaned lowercase words in O(n)
 */
export function tokenizeWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s+#.-]/g, ' ')
    .split(/\s+/)
    .map((w) => w.trim().replace(/[.,;:]+$/, ''))
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w));
}

/**
 * Pure function: Generates unigram, bigram, and trigram tokens from text in O(n)
 */
export function extractNGrams(words: string[], maxN = 3): string[] {
  const ngrams: string[] = [];

  for (let i = 0; i < words.length; i++) {
    let phrase = words[i];
    ngrams.push(phrase);

    for (let j = 1; j < maxN && i + j < words.length; j++) {
      phrase += ` ${words[i + j]}`;
      ngrams.push(phrase);
    }
  }

  return ngrams;
}

/**
 * Pure function: Extracts target skills and competencies from job description text
 */
export function extractTargetKeywords(
  jobDescription: string,
  maxN = 3
): {
  hardSkills: string[];
  softSkills: string[];
} {
  const textLower = jobDescription.toLowerCase();
  const foundHard: Set<string> = new Set();
  const foundSoft: Set<string> = new Set();

  // 1. O(k) dictionary scanning with word-boundary awareness
  for (const [key, canonical] of Object.entries(HARD_SKILLS_DICTIONARY)) {
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(?:^|[^a-zA-Z0-9#+])${escaped}(?:$|[^a-zA-Z0-9#+])`, 'i');
    if (regex.test(textLower)) {
      foundHard.add(canonical);
    }
  }

  for (const [key, canonical] of Object.entries(SOFT_SKILLS_DICTIONARY)) {
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(?:^|[^a-zA-Z0-9])${escaped}(?:$|[^a-zA-Z0-9])`, 'i');
    if (regex.test(textLower)) {
      foundSoft.add(canonical);
    }
  }

  // 2. Pattern-based requirement extraction ("Experience with X", "Proficiency in Y")
  const requirementPatterns = [
    /(?:experience with|proficiency in|knowledge of|proficient with|expertise in|familiarity with|background in)\s+([a-zA-Z0-9\s,+/.-]{3,60})(?=[.\n;])/gi,
  ];

  for (const pat of requirementPatterns) {
    let match: RegExpExecArray | null;
    while ((match = pat.exec(jobDescription)) !== null) {
      const items = match[1].split(/[,/]/).map((s) => s.trim().toLowerCase());
      for (const item of items) {
        if (item.length > 2 && item.length < 30) {
          if (HARD_SKILLS_DICTIONARY[item]) {
            foundHard.add(HARD_SKILLS_DICTIONARY[item]);
          } else if (SOFT_SKILLS_DICTIONARY[item]) {
            foundSoft.add(SOFT_SKILLS_DICTIONARY[item]);
          } else if (!STOP_WORDS.has(item)) {
            foundHard.add(item.charAt(0).toUpperCase() + item.slice(1));
          }
        }
      }
    }
  }

  // 3. High-frequency n-gram candidate extraction
  const tokens = tokenizeWords(jobDescription);
  const ngrams = extractNGrams(tokens, maxN);
  for (const ng of ngrams) {
    if (HARD_SKILLS_DICTIONARY[ng]) {
      foundHard.add(HARD_SKILLS_DICTIONARY[ng]);
    } else if (SOFT_SKILLS_DICTIONARY[ng]) {
      foundSoft.add(SOFT_SKILLS_DICTIONARY[ng]);
    }
  }

  return {
    hardSkills: Array.from(foundHard),
    softSkills: Array.from(foundSoft),
  };
}

/**
 * Generates matching regular expressions for keyword, including root and morphological variations
 */
function getMatchingRegexes(keyword: string): RegExp[] {
  const regexes: RegExp[] = [];
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  regexes.push(new RegExp(`(?:^|[^a-zA-Z0-9#+])${escaped}(?:$|[^a-zA-Z0-9#+])`, 'gi'));

  const lower = keyword.toLowerCase();
  if (lower.startsWith('mentor')) {
    regexes.push(/(?:^|[^a-zA-Z0-9])mentor\w*(?:$|[^a-zA-Z0-9])/gi);
  } else if (lower.startsWith('lead')) {
    regexes.push(/(?:^|[^a-zA-Z0-9])(?:lead\w*|led)(?:$|[^a-zA-Z0-9])/gi);
  } else if (lower.startsWith('collaborat')) {
    regexes.push(/(?:^|[^a-zA-Z0-9])collaborat\w*(?:$|[^a-zA-Z0-9])/gi);
  } else if (lower.startsWith('architect')) {
    regexes.push(/(?:^|[^a-zA-Z0-9])architect\w*(?:$|[^a-zA-Z0-9])/gi);
  } else if (lower.startsWith('manag')) {
    regexes.push(/(?:^|[^a-zA-Z0-9])manag\w*(?:$|[^a-zA-Z0-9])/gi);
  } else if (lower.endsWith('ing') || lower.endsWith('tion') || lower.endsWith('ship')) {
    const stem = lower.replace(/(?:ing|tion|ship)$/, '');
    if (stem.length >= 4) {
      regexes.push(new RegExp(`(?:^|[^a-zA-Z0-9])${stem}\\w*(?:$|[^a-zA-Z0-9])`, 'gi'));
    }
  }

  return regexes;
}

/**
 * Pure function: Searches profile sections for keyword presence and calculates frequency
 */
export function searchKeywordInProfile(
  keyword: string,
  profile: NormalizedProfile
): {
  found: boolean;
  locations: ('headline' | 'summary' | 'experience' | 'skills' | 'education')[];
  frequency: number;
} {
  const locations: ('headline' | 'summary' | 'experience' | 'skills' | 'education')[] = [];
  let frequency = 0;

  const regexes = getMatchingRegexes(keyword);

  const countOccurrences = (text: string) => {
    let count = 0;
    for (const rx of regexes) {
      const match = text.match(rx);
      if (match) {
        count += match.length;
      }
    }
    return count;
  };

  // 1. Headline
  if (profile.headline) {
    const count = countOccurrences(profile.headline);
    if (count > 0) {
      locations.push('headline');
      frequency += count;
    }
  }

  // 2. Summary
  if (profile.summary) {
    const count = countOccurrences(profile.summary);
    if (count > 0) {
      locations.push('summary');
      frequency += count;
    }
  }

  // 3. Experience
  let expCount = 0;
  for (const exp of profile.experiences) {
    expCount += countOccurrences(exp.title);
    if (exp.description) expCount += countOccurrences(exp.description);
    if (exp.bulletPoints) {
      for (const b of exp.bulletPoints) {
        expCount += countOccurrences(b);
      }
    }
  }
  if (expCount > 0) {
    locations.push('experience');
    frequency += expCount;
  }

  // 4. Skills array
  const normKw = keyword.toLowerCase().trim();
  const hasSkill = profile.skills.some((s) => {
    const normS = s.toLowerCase().trim();
    return normS === normKw || normS.includes(normKw) || normKw.includes(normS);
  });
  if (hasSkill) {
    locations.push('skills');
    frequency += 1;
  }

  // 5. Education
  let eduCount = 0;
  for (const edu of profile.education) {
    if (edu.degree) eduCount += countOccurrences(edu.degree);
    if (edu.fieldOfStudy) eduCount += countOccurrences(edu.fieldOfStudy);
  }
  if (eduCount > 0) {
    locations.push('education');
    frequency += eduCount;
  }

  return {
    found: locations.length > 0,
    locations,
    frequency,
  };
}

/**
 * Pure function: Compares profile against target requirements and generates gap report
 */
export function analyzeKeywordGapEngine(
  profile: NormalizedProfile,
  options: {
    targetJobDescription?: string;
    targetRoleKeywords?: string[];
    targetRoleTitle?: string;
    maxNGram?: number;
  }
): KeywordAnalysisReport {
  let hardTargets: string[] = [];
  let softTargets: string[] = [];

  if (options.targetJobDescription) {
    const extracted = extractTargetKeywords(options.targetJobDescription, options.maxNGram || 3);
    hardTargets.push(...extracted.hardSkills);
    softTargets.push(...extracted.softSkills);
  }

  if (options.targetRoleKeywords && options.targetRoleKeywords.length > 0) {
    for (const kw of options.targetRoleKeywords) {
      const lower = kw.toLowerCase().trim();
      if (HARD_SKILLS_DICTIONARY[lower]) {
        hardTargets.push(HARD_SKILLS_DICTIONARY[lower]);
      } else if (SOFT_SKILLS_DICTIONARY[lower]) {
        softTargets.push(SOFT_SKILLS_DICTIONARY[lower]);
      } else {
        hardTargets.push(kw.trim());
      }
    }
  }

  hardTargets = Array.from(new Set(hardTargets));
  softTargets = Array.from(new Set(softTargets));

  const matchedHard: string[] = [];
  const missingHard: string[] = [];
  const matchedSoft: string[] = [];
  const missingSoft: string[] = [];
  const details: KeywordEntry[] = [];

  const headlineRecs: string[] = [];
  const summaryRecs: string[] = [];
  const expRecs: string[] = [];
  const skillsRecs: string[] = [];

  // Evaluate hard skills
  for (const kw of hardTargets) {
    const search = searchKeywordInProfile(kw, profile);
    let placementRec = '';

    if (search.found) {
      matchedHard.push(kw);
      if (!search.locations.includes('skills')) {
        skillsRecs.push(`Add "${kw}" explicitly to your LinkedIn Skills section for search indexing.`);
      }
    } else {
      missingHard.push(kw);
      placementRec = `Add "${kw}" to Skills section and detail implementation in recent Experience bullets.`;
      skillsRecs.push(`Add "${kw}" to Skills section.`);
      expRecs.push(`Describe project deliverables utilizing "${kw}" in your experience bullets.`);
    }

    details.push({
      keyword: kw,
      category: 'hard',
      found: search.found,
      locations: search.locations,
      frequency: search.frequency,
      placementRecommendation: placementRec || undefined,
    });
  }

  // Evaluate soft skills
  for (const kw of softTargets) {
    const search = searchKeywordInProfile(kw, profile);
    let placementRec = '';

    if (search.found) {
      matchedSoft.push(kw);
    } else {
      missingSoft.push(kw);
      placementRec = `Demonstrate "${kw}" in your About summary and leadership bullets in Experience.`;
      summaryRecs.push(`Demonstrate "${kw}" in your About narrative.`);
      expRecs.push(`Highlight "${kw}" in cross-functional team initiatives.`);
    }

    details.push({
      keyword: kw,
      category: 'soft',
      found: search.found,
      locations: search.locations,
      frequency: search.frequency,
      placementRecommendation: placementRec || undefined,
    });
  }

  // Headline recommendations
  if (options.targetRoleTitle && !profile.headline.toLowerCase().includes(options.targetRoleTitle.toLowerCase())) {
    headlineRecs.push(`Include target role title "${options.targetRoleTitle}" in your headline.`);
  }
  if (missingHard.length > 0) {
    const top2 = missingHard.slice(0, 2);
    headlineRecs.push(`Highlight primary missing competencies ("${top2.join(', ')}") in your headline.`);
  }

  const totalIdentified = hardTargets.length + softTargets.length;
  const matchedCount = matchedHard.length + matchedSoft.length;
  const missingCount = missingHard.length + missingSoft.length;

  const matchScore = totalIdentified > 0
    ? Math.round((matchedCount / totalIdentified) * 100)
    : 100;

  return {
    matchScore,
    totalIdentified,
    matchedCount,
    missingCount,
    hardSkills: {
      matched: matchedHard,
      missing: missingHard,
    },
    softSkills: {
      matched: matchedSoft,
      missing: missingSoft,
    },
    details,
    strategicPlacements: {
      headline: Array.from(new Set(headlineRecs)),
      summary: Array.from(new Set(summaryRecs)),
      experience: Array.from(new Set(expRecs)),
      skills: Array.from(new Set(skillsRecs)),
    },
  };
}
