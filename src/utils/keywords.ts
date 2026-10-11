import { LinkedInProfile } from '../schemas/profile.js';

export interface KeywordMatch {
  keyword: string;
  category: 'hard' | 'soft';
  found: boolean;
  locations: ('headline' | 'summary' | 'experience' | 'skills' | 'education')[];
  frequencyInProfile: number;
  placementRecommendation?: string;
}

export interface KeywordGapResult {
  matchScore: number; // 0-100 percentage
  totalIdentifiedKeywords: number;
  matchedCount: number;
  missingCount: number;
  matchedHardSkills: string[];
  missingHardSkills: string[];
  matchedSoftSkills: string[];
  missingSoftSkills: string[];
  detailedMatches: KeywordMatch[];
  strategicPlacementAdvice: {
    headline: string[];
    summary: string[];
    experience: string[];
    skills: string[];
  };
}

// Canonical hard skills dictionary (case-insensitive lookup, display name preservation)
export const KNOWN_HARD_SKILLS: Record<string, string> = {
  // Programming Languages
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

  // Backend & APIs
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

  // Databases & Messaging
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

  // Cloud & DevOps
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

  // Architecture & Engineering
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

// Canonical soft skills & competencies dictionary
export const KNOWN_SOFT_SKILLS: Record<string, string> = {
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

/**
 * Normalizes keyword text for matching
 */
export function normalizeKeyword(kw: string): string {
  return kw.toLowerCase().trim().replace(/[.,;:]+$/, '');
}

/**
 * Extracts candidate keywords from job description text
 */
export function extractKeywordsFromText(jobDescription: string): {
  hardSkills: string[];
  softSkills: string[];
} {
  const textLower = jobDescription.toLowerCase();
  const foundHard: Set<string> = new Set();
  const foundSoft: Set<string> = new Set();

  // 1. Match against known hard skills
  for (const [key, canonical] of Object.entries(KNOWN_HARD_SKILLS)) {
    // Word boundary matching, escaping special characters like ++, #, .
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(?:^|[^a-zA-Z0-9#+])${escaped}(?:$|[^a-zA-Z0-9#+])`, 'i');
    if (regex.test(textLower)) {
      foundHard.add(canonical);
    }
  }

  // 2. Match against known soft skills
  for (const [key, canonical] of Object.entries(KNOWN_SOFT_SKILLS)) {
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(?:^|[^a-zA-Z0-9])${escaped}(?:$|[^a-zA-Z0-9])`, 'i');
    if (regex.test(textLower)) {
      foundSoft.add(canonical);
    }
  }

  // 3. Extract common requirements patterns: "experience with [items]", "proficiency in [items]"
  const requirementPatterns = [
    /(?:experience with|proficiency in|knowledge of|proficient with|expertise in|familiarity with|background in)\s+([a-zA-Z0-9\s,+/.-]{3,60})(?=[.\n;])/gi,
  ];

  for (const pat of requirementPatterns) {
    let match: RegExpExecArray | null;
    while ((match = pat.exec(jobDescription)) !== null) {
      const items = match[1].split(/[,/]/).map((s) => s.trim());
      for (const item of items) {
        if (item.length > 2 && item.length < 30) {
          const itemLower = normalizeKeyword(item);
          if (KNOWN_HARD_SKILLS[itemLower]) {
            foundHard.add(KNOWN_HARD_SKILLS[itemLower]);
          } else if (KNOWN_SOFT_SKILLS[itemLower]) {
            foundSoft.add(KNOWN_SOFT_SKILLS[itemLower]);
          } else if (!/^(and|or|the|with|such|as|in|for|to)$/i.test(itemLower)) {
            // Capitalized or technical-looking noun phrase
            foundHard.add(item.charAt(0).toUpperCase() + item.slice(1));
          }
        }
      }
    }
  }

  return {
    hardSkills: Array.from(foundHard),
    softSkills: Array.from(foundSoft),
  };
}

function getKeywordRegexes(keyword: string): RegExp[] {
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
 * Searches for a keyword inside profile sections
 */
function searchKeywordInProfile(
  keyword: string,
  profile: LinkedInProfile
): {
  found: boolean;
  locations: ('headline' | 'summary' | 'experience' | 'skills' | 'education')[];
  frequency: number;
} {
  const locations: ('headline' | 'summary' | 'experience' | 'skills' | 'education')[] = [];
  let frequency = 0;

  const regexes = getKeywordRegexes(keyword);

  // Helper to count occurrences across regexes
  const countMatches = (text: string) => {
    let count = 0;
    for (const rx of regexes) {
      const matches = text.match(rx);
      if (matches) {
        count += matches.length;
      }
    }
    return count;
  };

  // 1. Headline
  if (profile.headline) {
    const count = countMatches(profile.headline);
    if (count > 0) {
      locations.push('headline');
      frequency += count;
    }
  }

  // 2. Summary
  if (profile.summary) {
    const count = countMatches(profile.summary);
    if (count > 0) {
      locations.push('summary');
      frequency += count;
    }
  }

  // 3. Experience
  let expCount = 0;
  for (const exp of profile.experiences) {
    expCount += countMatches(exp.title);
    if (exp.description) expCount += countMatches(exp.description);
    if (exp.bulletPoints) {
      for (const b of exp.bulletPoints) {
        expCount += countMatches(b);
      }
    }
  }
  if (expCount > 0) {
    locations.push('experience');
    frequency += expCount;
  }

  // 4. Skills array
  const skillMatch = profile.skills.some((s) => {
    const normS = normalizeKeyword(s);
    const normK = normalizeKeyword(keyword);
    return normS === normK || normS.includes(normK) || normK.includes(normS);
  });
  if (skillMatch) {
    locations.push('skills');
    frequency += 1;
  }

  // 5. Education
  let eduCount = 0;
  for (const edu of profile.education) {
    if (edu.degree) eduCount += countMatches(edu.degree);
    if (edu.fieldOfStudy) eduCount += countMatches(edu.fieldOfStudy);
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
 * Compares LinkedIn profile against target job description or keywords list
 */
export function analyzeKeywordGap(
  profile: LinkedInProfile,
  options: {
    targetJobDescription?: string;
    targetRoleKeywords?: string[];
    targetRoleTitle?: string;
  }
): KeywordGapResult {
  let targetHard: string[] = [];
  let targetSoft: string[] = [];

  if (options.targetJobDescription) {
    const extracted = extractKeywordsFromText(options.targetJobDescription);
    targetHard.push(...extracted.hardSkills);
    targetSoft.push(...extracted.softSkills);
  }

  if (options.targetRoleKeywords && options.targetRoleKeywords.length > 0) {
    for (const kw of options.targetRoleKeywords) {
      const lower = normalizeKeyword(kw);
      if (KNOWN_HARD_SKILLS[lower]) {
        targetHard.push(KNOWN_HARD_SKILLS[lower]);
      } else if (KNOWN_SOFT_SKILLS[lower]) {
        targetSoft.push(KNOWN_SOFT_SKILLS[lower]);
      } else {
        targetHard.push(kw.trim());
      }
    }
  }

  // Deduplicate
  targetHard = Array.from(new Set(targetHard));
  targetSoft = Array.from(new Set(targetSoft));

  const detailedMatches: KeywordMatch[] = [];
  const matchedHardSkills: string[] = [];
  const missingHardSkills: string[] = [];
  const matchedSoftSkills: string[] = [];
  const missingSoftSkills: string[] = [];

  const headlineAdvice: string[] = [];
  const summaryAdvice: string[] = [];
  const expAdvice: string[] = [];
  const skillsAdvice: string[] = [];

  // Evaluate hard skills
  for (const kw of targetHard) {
    const search = searchKeywordInProfile(kw, profile);
    let placementRec = '';

    if (search.found) {
      matchedHardSkills.push(kw);
      if (!search.locations.includes('skills')) {
        skillsAdvice.push(`Add "${kw}" to your LinkedIn Skills section for ATS indexing.`);
      }
    } else {
      missingHardSkills.push(kw);
      placementRec = `Add "${kw}" to your Skills section and detail practical usage in recent Experience bullet points.`;
      skillsAdvice.push(`Add "${kw}" to Skills section.`);
      expAdvice.push(`Describe a project or impact utilizing "${kw}" in your experience bullets.`);
    }

    detailedMatches.push({
      keyword: kw,
      category: 'hard',
      found: search.found,
      locations: search.locations,
      frequencyInProfile: search.frequency,
      placementRecommendation: placementRec || undefined,
    });
  }

  // Evaluate soft skills
  for (const kw of targetSoft) {
    const search = searchKeywordInProfile(kw, profile);
    let placementRec = '';

    if (search.found) {
      matchedSoftSkills.push(kw);
    } else {
      missingSoftSkills.push(kw);
      placementRec = `Demonstrate "${kw}" in your About narrative and leadership/collaboration bullets in Experience.`;
      summaryAdvice.push(`Demonstrate "${kw}" in your About career overview.`);
      expAdvice.push(`Highlight "${kw}" in team achievements or cross-functional deliverables.`);
    }

    detailedMatches.push({
      keyword: kw,
      category: 'soft',
      found: search.found,
      locations: search.locations,
      frequencyInProfile: search.frequency,
      placementRecommendation: placementRec || undefined,
    });
  }

  // Recommend headline additions if targetRoleTitle is provided or top missing hard skills
  if (options.targetRoleTitle && !profile.headline.toLowerCase().includes(options.targetRoleTitle.toLowerCase())) {
    headlineAdvice.push(`Include target role title "${options.targetRoleTitle}" in your headline.`);
  }
  if (missingHardSkills.length > 0) {
    const top2 = missingHardSkills.slice(0, 2);
    headlineAdvice.push(`Consider featuring key competencies like "${top2.join(', ')}" in headline if aligned with your expertise.`);
  }

  const totalIdentifiedKeywords = targetHard.length + targetSoft.length;
  const matchedCount = matchedHardSkills.length + matchedSoftSkills.length;
  const missingCount = missingHardSkills.length + missingSoftSkills.length;

  const matchScore = totalIdentifiedKeywords > 0
    ? Math.round((matchedCount / totalIdentifiedKeywords) * 100)
    : 100;

  return {
    matchScore,
    totalIdentifiedKeywords,
    matchedCount,
    missingCount,
    matchedHardSkills,
    missingHardSkills,
    matchedSoftSkills,
    missingSoftSkills,
    detailedMatches,
    strategicPlacementAdvice: {
      headline: Array.from(new Set(headlineAdvice)),
      summary: Array.from(new Set(summaryAdvice)),
      experience: Array.from(new Set(expAdvice)),
      skills: Array.from(new Set(skillsAdvice)),
    },
  };
}
