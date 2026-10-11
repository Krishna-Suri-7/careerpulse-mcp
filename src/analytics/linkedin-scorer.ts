import { NormalizedProfile, NormalizedExperience } from '../contracts/profile-schema.js';
import { isBulletQuantified, STRONG_ACTION_VERBS } from './ats-engine.js';

// ============================================================================
// Data Contracts & Types
// ============================================================================

export interface HeadlineAudit {
  score: number; // out of 25
  charCount: number;
  detectedRole?: string;
  detectedSkills: string[];
  vaguePhrasesFound: string[];
  analysis: string;
  rewrites: {
    variantA: string; // Direct Impact & Core Stack
    variantB: string; // Domain, Scale & Systems
  };
}

export interface AboutSectionAudit {
  score: number; // out of 20
  wordCount: number;
  aboveTheFoldPreview: string; // first 250 characters
  hasIntroFiller: boolean;
  detectedFiller?: string;
  hasDirectCTA: boolean;
  contactDetailsFound: string[];
  review: string;
}

export interface ExperienceScore {
  score: number; // out of 30
  totalRoles: number;
  totalBullets: number;
  openingBulletsStrong: number;
  quantifiedBulletCount: number;
  xyzMetricRatio: number;
  artifactsFound: string[];
  breakdown: string;
}

export interface LinkedInLandingPageAuditResult {
  overallScore: number; // 0 - 100
  headlineAudit: HeadlineAudit;
  aboutSectionAudit: AboutSectionAudit;
  experienceScore: ExperienceScore;
  criticalChecklist: string[];
  categoryBreakdown: {
    headlineSeo: {
      score: number;
      max: number; // 25
      targetRolePresence: number; // 10
      techStackClustering: number; // 10
      characterEfficiency: number; // 5
      details: string;
    };
    aboutSection: {
      score: number;
      max: number; // 20
      hookEfficiency: number; // 10
      depthAndStructure: number; // 5
      directContactCTA: number; // 5
      details: string;
    };
    experienceProof: {
      score: number;
      max: number; // 30
      openingBulletStrength: number; // 10
      xyzMetricDensity: number; // 15
      artifactPresence: number; // 5
      details: string;
    };
    skillsRelevance: {
      score: number;
      max: number; // 15
      topThreeAlignment: number; // 10
      contextualMapping: number; // 5
      details: string;
    };
    algorithmicActivity: {
      score: number;
      max: number; // 10
      recencyStatus: number; // 10
      details: string;
    };
  };
}

export interface AuditLinkedInPageOptions {
  targetRole?: string;
  activityDaysAgo?: number;
  recentPostText?: string;
}

// ============================================================================
// Dictionaries & Extraction Helpers
// ============================================================================

const COMMON_TECH_SKILLS: ReadonlySet<string> = new Set([
  'react', 'node.js', 'nodejs', 'typescript', 'javascript', 'python', 'go', 'golang',
  'java', 'c++', 'c#', '.net', 'rust', 'ruby', 'php', 'swift', 'kotlin',
  'aws', 'gcp', 'azure', 'kubernetes', 'docker', 'terraform', 'graphql',
  'postgresql', 'postgres', 'mysql', 'mongodb', 'redis', 'kafka', 'elasticsearch',
  'distributed systems', 'microservices', 'ci/cd', 'devops', 'linux', 'system design',
  'rest api', 'next.js', 'vue', 'angular', 'tailwind', 'tailwind css', 'spark', 'pytorch',
  'tensorflow', 'sql', 'nosql', 'dynamodb', 'snowflake', 'grpc', 'fastapi',
]);

const VAGUE_HEADLINE_PHRASES: readonly RegExp[] = [
  /\baspiring\b/i,
  /\bpassionate student\b/i,
  /\bseeking opportunities\b/i,
  /\blooking for opportunities\b/i,
  /\bopen to work\b/i,
  /\bopen to opportunities\b/i,
  /\bactively looking\b/i,
  /\bstudent at\b/i,
  /\bentry level\b/i,
  /\bunemployed\b/i,
  /\blooking for my next role\b/i,
];

const INTRO_FILLER_PHRASES: readonly RegExp[] = [
  /\bwelcome to my profile\b/i,
  /\bhello and welcome\b/i,
  /\bhi there\b/i,
  /\bmy name is\b/i,
  /\bi am a passionate\b/i,
  /\bi am a dedicated\b/i,
  /\bseeking a challenging\b/i,
  /\blooking for a role\b/i,
  /\bthanks for visiting\b/i,
  /\bi'm a passionate\b/i,
];

const SYSTEM_PRODUCT_TERMS: readonly RegExp[] = [
  /\b(system|systems|platform|platforms|pipeline|pipelines|service|services|microservice|microservices)\b/i,
  /\b(api|apis|database|databases|infrastructure|engine|ledger|cluster|clusters|framework|application|backend|frontend)\b/i,
];

/**
 * Escapes regex special characters in a string.
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Helper to test if a skill appears in text with boundary safety.
 */
function isSkillInText(skill: string, text: string): boolean {
  const trimmed = skill.trim();
  if (!trimmed) return false;
  const escaped = escapeRegex(trimmed);
  const prefix = /^\w/.test(trimmed) ? '\\b' : '';
  const suffix = /\w$/.test(trimmed) ? '\\b' : '';
  const regex = new RegExp(`${prefix}${escaped}${suffix}`, 'i');
  return regex.test(text);
}

// ============================================================================
// Pillar 1: Headline SEO & Hook (25 Points)
// ============================================================================

export function evaluateHeadlineSeo(
  headline: string,
  targetRole?: string,
  profileSkills: string[] = []
): {
  score: number;
  targetRolePresence: number;
  techStackClustering: number;
  characterEfficiency: number;
  detectedRole?: string;
  detectedSkills: string[];
  vaguePhrasesFound: string[];
  analysis: string;
  rewrites: { variantA: string; variantB: string };
} {
  const cleanHeadline = (headline || '').trim();
  const charCount = cleanHeadline.length;

  // 1. Target Role Presence (10 pts)
  let targetRolePresence = 0;
  const vaguePhrasesFound: string[] = [];

  for (const pattern of VAGUE_HEADLINE_PHRASES) {
    const match = cleanHeadline.match(pattern);
    if (match) {
      vaguePhrasesFound.push(match[0]);
    }
  }

  const roleTitlePattern =
    /\b(staff|senior|principal|lead|junior|lead|cloud|backend|frontend|full[- ]?stack|systems|data|devops|software|machine learning|security|embedded)?\s*(software|backend|frontend|full[- ]?stack|data|systems|platform|cloud|devops|ml|ai)?\s*(engineer|developer|architect|specialist|manager|scientist)\b/i;

  const firstSegment = cleanHeadline.split(/[|•—,-]/)[0]?.trim() || '';
  const matchFirstRole = firstSegment.match(roleTitlePattern);
  const matchAnyRole = cleanHeadline.match(roleTitlePattern);

  if (vaguePhrasesFound.length > 0) {
    targetRolePresence = 0; // Penalized heavily for vague phrasing
  } else if (matchFirstRole && matchFirstRole[0].length >= 8) {
    targetRolePresence = 10;
  } else if (matchAnyRole) {
    targetRolePresence = 6;
  } else if (cleanHeadline.length >= 10 && !vaguePhrasesFound.length) {
    targetRolePresence = 3;
  }

  const detectedRole = matchFirstRole ? matchFirstRole[0] : (matchAnyRole ? matchAnyRole[0] : targetRole);

  // 2. Tech Stack Clustering (10 pts)
  const segments = cleanHeadline
    .split(/[|,•—/]/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  const detectedSkillsSet = new Set<string>();

  // Check known tech skills and profile skills in headline
  for (const tech of COMMON_TECH_SKILLS) {
    if (isSkillInText(tech, cleanHeadline)) {
      detectedSkillsSet.add(tech);
    }
  }
  for (const skill of profileSkills) {
    if (skill.length >= 2 && isSkillInText(skill, cleanHeadline)) {
      detectedSkillsSet.add(skill.toLowerCase());
    }
  }

  const detectedSkills = Array.from(detectedSkillsSet);
  let techStackClustering = 0;
  if (detectedSkills.length >= 2 && detectedSkills.length <= 4) {
    techStackClustering = 10;
  } else if (detectedSkills.length > 4) {
    techStackClustering = 7; // Slight deduction for keyword stuffing
  } else if (detectedSkills.length === 1) {
    techStackClustering = 4;
  } else {
    techStackClustering = 0;
  }

  // 3. Character Efficiency (5 pts)
  let characterEfficiency = 0;
  if (charCount >= 70 && charCount <= 200) {
    characterEfficiency = 5;
  } else if (charCount > 200 && charCount <= 220) {
    characterEfficiency = 3;
  } else if (charCount >= 40 && charCount < 70) {
    characterEfficiency = 2;
  } else {
    characterEfficiency = 0;
  }

  const score = targetRolePresence + techStackClustering + characterEfficiency;

  // Analysis narrative
  const notes: string[] = [];
  if (targetRolePresence === 10) notes.push('Starts with a concrete, searchable engineering title.');
  else if (vaguePhrasesFound.length > 0) notes.push(`Contains vague phrasing ("${vaguePhrasesFound.join(', ')}") that depresses search rank.`);
  else notes.push('Missing explicit engineering role title at the start of the headline.');

  if (techStackClustering === 10) notes.push(`Strong technology clustering with ${detectedSkills.length} key skills.`);
  else if (techStackClustering > 0) notes.push(`Identified ${detectedSkills.length} skills (ideal: 2 to 4 comma/pipe-separated skills).`);
  else notes.push('No technical skills clustered; recruiters filter on explicit stack keywords.');

  if (characterEfficiency === 5) notes.push(`Optimal character usage (${charCount}/220 characters).`);
  else notes.push(`Suboptimal length (${charCount}/220 characters; target: 70-200 chars).`);

  // High-converting rewrites
  const rolePrefix = detectedRole || targetRole || 'Senior Software Engineer';
  const topSkills = (detectedSkills.length >= 2 ? detectedSkills : profileSkills.length >= 2 ? profileSkills : ['TypeScript', 'Go', 'AWS', 'Kubernetes'])
    .slice(0, 4)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1));

  const variantA = `${rolePrefix} | ${topSkills.join(' • ')} | Building High-Scale Distributed Platforms`;
  const variantB = `${rolePrefix} | ${topSkills.join(' | ')} | Scaling Low-Latency Cloud Architectures`;

  return {
    score,
    targetRolePresence,
    techStackClustering,
    characterEfficiency,
    detectedRole,
    detectedSkills,
    vaguePhrasesFound,
    analysis: notes.join(' '),
    rewrites: {
      variantA,
      variantB,
    },
  };
}

// ============================================================================
// Pillar 2: "Above-the-Fold" About Section (20 Points)
// ============================================================================

export function evaluateAboutSection(
  summary: string,
  contactInfo?: { email?: string; portfolioUrl?: string; websites?: string[] }
): {
  score: number;
  hookEfficiency: number;
  depthAndStructure: number;
  directContactCTA: number;
  wordCount: number;
  aboveTheFoldPreview: string;
  hasIntroFiller: boolean;
  detectedFiller?: string;
  hasDirectCTA: boolean;
  contactDetailsFound: string[];
  review: string;
} {
  const cleanSummary = (summary || '').trim();
  const wordCount = cleanSummary ? cleanSummary.split(/\s+/).filter(Boolean).length : 0;
  const aboveTheFoldPreview = cleanSummary.slice(0, 250);

  // 1. Hook Efficiency (10 pts)
  let hookEfficiency = 0;
  let hasIntroFiller = false;
  let detectedFiller: string | undefined;

  for (const pattern of INTRO_FILLER_PHRASES) {
    const match = aboveTheFoldPreview.match(pattern);
    if (match) {
      hasIntroFiller = true;
      detectedFiller = match[0];
      break;
    }
  }

  const hasSpecialtyInHook =
    /\b(engineer|architect|developer|backend|frontend|distributed|cloud|full[- ]?stack|data|systems|infrastructure)\b/i.test(
      aboveTheFoldPreview
    );

  const hasStackInHook = Array.from(COMMON_TECH_SKILLS).some((s) => isSkillInText(s, aboveTheFoldPreview));

  if (hasIntroFiller) {
    hookEfficiency = 0;
  } else if (hasSpecialtyInHook && hasStackInHook) {
    hookEfficiency = 10;
  } else if (hasSpecialtyInHook) {
    hookEfficiency = 6;
  } else if (cleanSummary.length > 0) {
    hookEfficiency = 2;
  }

  // 2. Depth and Structure (5 pts)
  let depthAndStructure = 0;
  const hasFormatting =
    cleanSummary.includes('\n\n') ||
    cleanSummary.includes('•') ||
    cleanSummary.includes('- ') ||
    cleanSummary.includes('* ');

  if (wordCount >= 100 && wordCount <= 350 && hasFormatting) {
    depthAndStructure = 5;
  } else if (wordCount >= 100 && wordCount <= 350) {
    depthAndStructure = 3; // Lacks clear breaks/bullets
  } else if (wordCount > 0 && wordCount < 100) {
    depthAndStructure = 2; // Underdeveloped
  } else if (wordCount > 350) {
    depthAndStructure = 2; // Too verbose
  }

  // 3. Direct Contact CTA (5 pts)
  let directContactCTA = 0;
  const contactDetailsFound: string[] = [];

  const emailMatch = cleanSummary.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  if (emailMatch) contactDetailsFound.push(emailMatch[0]);
  else if (contactInfo?.email) contactDetailsFound.push(contactInfo.email);

  const githubMatch = cleanSummary.match(/(?:github\.com\/|gh:|[gG]it[hH]ub:\s*@?)([a-zA-Z0-9_-]+)/i);
  if (githubMatch) contactDetailsFound.push(`GitHub: ${githubMatch[1]}`);

  const portfolioMatch = cleanSummary.match(/https?:\/\/[^\s]+/i);
  if (portfolioMatch) contactDetailsFound.push(portfolioMatch[0]);
  else if (contactInfo?.portfolioUrl) contactDetailsFound.push(contactInfo.portfolioUrl);

  const hasDirectCTA = contactDetailsFound.length > 0;
  if (hasDirectCTA) {
    directContactCTA = 5;
  }

  const score = hookEfficiency + depthAndStructure + directContactCTA;

  const notes: string[] = [];
  if (hookEfficiency === 10) notes.push('Strong above-the-fold hook declaring core domain and stack immediately.');
  else if (hasIntroFiller) notes.push(`Above-the-fold cutoff contains filler text ("${detectedFiller}") instead of value proposition.`);
  else notes.push('Above-the-fold copy lacks immediate technical stack or specialty statement.');

  if (depthAndStructure === 5) notes.push(`Well-structured narrative depth (${wordCount} words) with clean breaks.`);
  else notes.push(`About section depth is ${wordCount} words (ideal: 100-350 words formatted with breaks/bullets).`);

  if (hasDirectCTA) notes.push(`Includes direct call to action with verified contact point (${contactDetailsFound[0]}).`);
  else notes.push('Missing explicit contact CTA (email, GitHub, or portfolio) before reader moves on.');

  return {
    score,
    hookEfficiency,
    depthAndStructure,
    directContactCTA,
    wordCount,
    aboveTheFoldPreview,
    hasIntroFiller,
    detectedFiller,
    hasDirectCTA,
    contactDetailsFound,
    review: notes.join(' '),
  };
}

// ============================================================================
// Pillar 3: Experience & Project Proof-of-Work (30 Points)
// ============================================================================

export function evaluateExperienceProof(experiences: NormalizedExperience[]): {
  score: number;
  openingBulletStrength: number;
  xyzMetricDensity: number;
  artifactPresence: number;
  totalRoles: number;
  totalBullets: number;
  openingBulletsStrong: number;
  quantifiedBulletCount: number;
  xyzMetricRatio: number;
  artifactsFound: string[];
  breakdown: string;
} {
  const totalRoles = experiences.length;
  if (totalRoles === 0) {
    return {
      score: 0,
      openingBulletStrength: 0,
      xyzMetricDensity: 0,
      artifactPresence: 0,
      totalRoles: 0,
      totalBullets: 0,
      openingBulletsStrong: 0,
      quantifiedBulletCount: 0,
      xyzMetricRatio: 0,
      artifactsFound: [],
      breakdown: 'No work experience or project entries recorded.',
    };
  }

  let totalBullets = 0;
  let quantifiedBulletCount = 0;
  let openingBulletsStrong = 0;
  const artifactsFound: string[] = [];

  for (const exp of experiences) {
    const bullets =
      exp.bulletPoints && exp.bulletPoints.length > 0
        ? exp.bulletPoints
        : exp.description
        ? exp.description.split('\n').filter((l) => l.trim().length > 15)
        : [];

    if (bullets.length > 0) {
      const firstBullet = bullets[0].trim();
      const firstWord = firstBullet.match(/^([a-zA-Z-]+)/)?.[1]?.toLowerCase() || '';
      const hasActionVerb = STRONG_ACTION_VERBS.has(firstWord);
      const hasSystemProduct = SYSTEM_PRODUCT_TERMS.some((term) => term.test(firstBullet));

      if (hasActionVerb && hasSystemProduct) {
        openingBulletsStrong++;
      }
    }

    // Check all bullets for metrics and artifacts
    for (const b of bullets) {
      totalBullets++;
      if (isBulletQuantified(b).hasMetrics) {
        quantifiedBulletCount++;
      }

      // Check artifacts
      const urlMatches = b.match(/https?:\/\/[^\s)]+|github\.com\/[^\s)]+/gi);
      if (urlMatches) {
        artifactsFound.push(...urlMatches);
      }
    }

    if (exp.description) {
      const descUrls = exp.description.match(/https?:\/\/[^\s)]+|github\.com\/[^\s)]+/gi);
      if (descUrls) {
        artifactsFound.push(...descUrls);
      }
    }
  }

  // 1. Opening Bullet Strength (10 pts)
  let openingBulletStrength = 0;
  const strongRatio = totalRoles > 0 ? openingBulletsStrong / totalRoles : 0;
  if (strongRatio >= 0.8) {
    openingBulletStrength = 10;
  } else if (strongRatio >= 0.5) {
    openingBulletStrength = 6;
  } else if (totalRoles > 0) {
    openingBulletStrength = 2;
  }

  // 2. XYZ Metric Density (15 pts) - target: >= 50%
  const xyzMetricRatio = totalBullets > 0 ? Math.round((quantifiedBulletCount / totalBullets) * 100) / 100 : 0;
  let xyzMetricDensity = 0;
  if (xyzMetricRatio >= 0.50) {
    xyzMetricDensity = 15;
  } else if (xyzMetricRatio >= 0.35) {
    xyzMetricDensity = 10;
  } else if (xyzMetricRatio >= 0.20) {
    xyzMetricDensity = 6;
  } else if (totalBullets > 0) {
    xyzMetricDensity = 2;
  }

  // 3. Artifact Presence (5 pts)
  const uniqueArtifacts = Array.from(new Set(artifactsFound));
  const artifactPresence = uniqueArtifacts.length > 0 ? 5 : 0;

  const score = openingBulletStrength + xyzMetricDensity + artifactPresence;

  const breakdown = `${openingBulletsStrong}/${totalRoles} roles lead with strong system/product statements. ${quantifiedBulletCount}/${totalBullets} bullets (${Math.round(xyzMetricRatio * 100)}%) contain quantifiable metrics. Artifact links detected: ${uniqueArtifacts.length}.`;

  return {
    score,
    openingBulletStrength,
    xyzMetricDensity,
    artifactPresence,
    totalRoles,
    totalBullets,
    openingBulletsStrong,
    quantifiedBulletCount,
    xyzMetricRatio,
    artifactsFound: uniqueArtifacts,
    breakdown,
  };
}

// ============================================================================
// Pillar 4: Skills Graph Relevance (15 Points)
// ============================================================================

export function evaluateSkillsRelevance(
  skills: string[],
  experiences: NormalizedExperience[],
  targetRole?: string,
  headline?: string
): {
  score: number;
  topThreeAlignment: number;
  contextualMapping: number;
  topThreeSkills: string[];
  integratedRatio: number;
  details: string;
} {
  if (!skills || skills.length === 0) {
    return {
      score: 0,
      topThreeAlignment: 0,
      contextualMapping: 0,
      topThreeSkills: [],
      integratedRatio: 0,
      details: 'No skills listed in profile.',
    };
  }

  const topThreeSkills = skills.slice(0, 3);

  // 1. Top 3 Alignment (10 pts)
  const roleContext = `${targetRole || ''} ${headline || ''}`.toLowerCase();
  let alignedCount = 0;

  for (const s of topThreeSkills) {
    const sLower = s.toLowerCase();
    if (roleContext.includes(sLower) || COMMON_TECH_SKILLS.has(sLower)) {
      alignedCount++;
    }
  }

  let topThreeAlignment = 0;
  if (alignedCount >= 2 && topThreeSkills.length >= 3) {
    topThreeAlignment = 10;
  } else if (alignedCount >= 1) {
    topThreeAlignment = 5;
  } else {
    topThreeAlignment = 2;
  }

  // 2. Contextual Mapping (5 pts)
  const combinedBulletText = experiences
    .flatMap((e) => [e.description || '', ...(e.bulletPoints || [])])
    .join('\n');

  let integratedCount = 0;
  for (const s of skills) {
    if (isSkillInText(s, combinedBulletText)) {
      integratedCount++;
    }
  }

  const integratedRatio = skills.length > 0 ? Math.round((integratedCount / skills.length) * 100) / 100 : 0;
  let contextualMapping = 0;
  if (integratedRatio >= 0.60) {
    contextualMapping = 5;
  } else if (integratedRatio >= 0.30) {
    contextualMapping = 3;
  } else {
    contextualMapping = 1;
  }

  const score = topThreeAlignment + contextualMapping;
  const details = `Top 3 pinned skills: [${topThreeSkills.join(', ')}]. ${integratedCount}/${skills.length} skills (${Math.round(integratedRatio * 100)}%) demonstrated in experience text.`;

  return {
    score,
    topThreeAlignment,
    contextualMapping,
    topThreeSkills,
    integratedRatio,
    details,
  };
}

// ============================================================================
// Pillar 5: Algorithmic Activity & Recency (10 Points)
// ============================================================================

export function evaluateAlgorithmicActivity(
  experiences: NormalizedExperience[],
  activityDaysAgo?: number,
  recentPostText?: string
): {
  score: number;
  recencyStatus: number;
  status: 'active' | 'decay_risk' | 'stale';
  details: string;
} {
  // If recent post text is supplied and non-empty, activity is verified within 30 days
  if (recentPostText && recentPostText.trim().length > 10) {
    return {
      score: 10,
      recencyStatus: 10,
      status: 'active',
      details: 'Recent technical post verified within 30 days; clears LinkedIn Recruiter active candidate spotlight filter.',
    };
  }

  // If activityDaysAgo is provided
  if (activityDaysAgo !== undefined) {
    if (activityDaysAgo <= 30) {
      return {
        score: 10,
        recencyStatus: 10,
        status: 'active',
        details: `Active within last ${activityDaysAgo} days; clears 30-day activity filter.`,
      };
    } else if (activityDaysAgo <= 90) {
      return {
        score: 5,
        recencyStatus: 5,
        status: 'decay_risk',
        details: `Last active ${activityDaysAgo} days ago; currently suffering from LinkedIn Recruiter 30-day activity decay.`,
      };
    } else {
      return {
        score: 0,
        recencyStatus: 0,
        status: 'stale',
        details: `Inactive for ${activityDaysAgo} days; ranked lower in recruiter search results due to decay penalty.`,
      };
    }
  }

  // Fallback: Check if current role exists and has recent dates
  const hasCurrentRole = experiences.some(
    (e) => e.isCurrent || (e.endDate && /present|current/i.test(e.endDate))
  );

  if (hasCurrentRole) {
    return {
      score: 8,
      recencyStatus: 8,
      status: 'active',
      details: 'Active current role detected. Publish a technical post every 14-30 days to maximize spotlight discovery rank.',
    };
  }

  return {
    score: 0,
    recencyStatus: 0,
    status: 'stale',
    details: 'No current role or public activity recorded within 30 days; vulnerable to recruiter search decay.',
  };
}

// ============================================================================
// Main Orchestration: auditLinkedInLandingPage
// ============================================================================

/**
 * Audits a candidate's LinkedIn profile as an SEO landing page and returns
 * full diagnostic metrics, rewrite variants, and high-ROI fixes.
 */
export function auditLinkedInLandingPage(
  profile: NormalizedProfile,
  options: AuditLinkedInPageOptions = {}
): LinkedInLandingPageAuditResult {
  const headlineResult = evaluateHeadlineSeo(profile.headline, options.targetRole, profile.skills);
  const aboutResult = evaluateAboutSection(profile.summary, profile.contactInfo);
  const experienceResult = evaluateExperienceProof(profile.experiences || []);
  const skillsResult = evaluateSkillsRelevance(
    profile.skills || [],
    profile.experiences || [],
    options.targetRole,
    profile.headline
  );
  const activityResult = evaluateAlgorithmicActivity(
    profile.experiences || [],
    options.activityDaysAgo,
    options.recentPostText
  );

  const overallScore = Math.max(
    0,
    Math.min(
      100,
      headlineResult.score +
        aboutResult.score +
        experienceResult.score +
        skillsResult.score +
        activityResult.score
    )
  );

  // Determine top 3 high-ROI actions for criticalChecklist
  const lostPointsTable = [
    {
      pillar: 'Headline SEO & Hook',
      lost: 25 - headlineResult.score,
      action: `Rewrite headline to concrete format: "${headlineResult.rewrites.variantA}" to rank in recruiter keyword searches. (Potential gain: +${25 - headlineResult.score} pts)`,
    },
    {
      pillar: 'Above-the-Fold About',
      lost: 20 - aboutResult.score,
      action: aboutResult.hasIntroFiller
        ? `Remove introductory filler ("${aboutResult.detectedFiller}") and state core specialty in first 250 chars. (Potential gain: +${20 - aboutResult.score} pts)`
        : `Add explicit contact CTA (email or GitHub) and structure About section to 100-350 words. (Potential gain: +${20 - aboutResult.score} pts)`,
    },
    {
      pillar: 'Experience Proof-of-Work',
      lost: 30 - experienceResult.score,
      action: `Add quantifiable metrics (%, scale, latency) to at least 50% of experience bullets and link GitHub/project artifacts. (Potential gain: +${30 - experienceResult.score} pts)`,
    },
    {
      pillar: 'Skills Graph Relevance',
      lost: 15 - skillsResult.score,
      action: `Pin top 3 skills that match your target role and weave them directly into experience bullet points. (Potential gain: +${15 - skillsResult.score} pts)`,
    },
    {
      pillar: '30-Day Activity Recency',
      lost: 10 - activityResult.score,
      action: `Publish a concise proof-of-work engineering post (<180 words) to clear LinkedIn Recruiter's 30-day activity decay filter. (Potential gain: +${10 - activityResult.score} pts)`,
    },
  ];

  lostPointsTable.sort((a, b) => b.lost - a.lost);
  const criticalChecklist = lostPointsTable
    .filter((item) => item.lost > 0)
    .slice(0, 3)
    .map((item) => item.action);

  if (criticalChecklist.length === 0) {
    criticalChecklist.push('Profile is exceptionally optimized as a landing page. Maintain monthly proof-of-work posting.');
  }

  const categoryBreakdown = {
    headlineSeo: {
      score: headlineResult.score,
      max: 25,
      targetRolePresence: headlineResult.targetRolePresence,
      techStackClustering: headlineResult.techStackClustering,
      characterEfficiency: headlineResult.characterEfficiency,
      details: headlineResult.analysis,
    },
    aboutSection: {
      score: aboutResult.score,
      max: 20,
      hookEfficiency: aboutResult.hookEfficiency,
      depthAndStructure: aboutResult.depthAndStructure,
      directContactCTA: aboutResult.directContactCTA,
      details: aboutResult.review,
    },
    experienceProof: {
      score: experienceResult.score,
      max: 30,
      openingBulletStrength: experienceResult.openingBulletStrength,
      xyzMetricDensity: experienceResult.xyzMetricDensity,
      artifactPresence: experienceResult.artifactPresence,
      details: experienceResult.breakdown,
    },
    skillsRelevance: {
      score: skillsResult.score,
      max: 15,
      topThreeAlignment: skillsResult.topThreeAlignment,
      contextualMapping: skillsResult.contextualMapping,
      details: skillsResult.details,
    },
    algorithmicActivity: {
      score: activityResult.score,
      max: 10,
      recencyStatus: activityResult.recencyStatus,
      details: activityResult.details,
    },
  };

  const headlineAudit: HeadlineAudit = {
    score: headlineResult.score,
    charCount: headlineResult.characterEfficiency,
    detectedRole: headlineResult.detectedRole,
    detectedSkills: headlineResult.detectedSkills,
    vaguePhrasesFound: headlineResult.vaguePhrasesFound,
    analysis: headlineResult.analysis,
    rewrites: headlineResult.rewrites,
  };

  const aboutSectionAudit: AboutSectionAudit = {
    score: aboutResult.score,
    wordCount: aboutResult.wordCount,
    aboveTheFoldPreview: aboutResult.aboveTheFoldPreview,
    hasIntroFiller: aboutResult.hasIntroFiller,
    detectedFiller: aboutResult.detectedFiller,
    hasDirectCTA: aboutResult.hasDirectCTA,
    contactDetailsFound: aboutResult.contactDetailsFound,
    review: aboutResult.review,
  };

  const experienceScore: ExperienceScore = {
    score: experienceResult.score,
    totalRoles: experienceResult.totalRoles,
    totalBullets: experienceResult.totalBullets,
    openingBulletsStrong: experienceResult.openingBulletsStrong,
    quantifiedBulletCount: experienceResult.quantifiedBulletCount,
    xyzMetricRatio: experienceResult.xyzMetricRatio,
    artifactsFound: experienceResult.artifactsFound,
    breakdown: experienceResult.breakdown,
  };

  return {
    overallScore,
    headlineAudit,
    aboutSectionAudit,
    experienceScore,
    criticalChecklist,
    categoryBreakdown,
  };
}
