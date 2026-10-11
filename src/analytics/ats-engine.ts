import { NormalizedProfile, NormalizedExperience } from '../contracts/profile-schema.js';

// ============================================================================
// Data Contracts & Types
// ============================================================================

export interface BulletAuditRecord {
  text: string;
  wordCount: number;
  hasActionVerb: boolean;
  detectedActionVerb?: string;
  ownershipScore: number; // +1.0 (Strong), +0.5 (Neutral), -1.0 (Weak), 0.0 (Other)
  ownershipCategory: 'strong' | 'neutral' | 'weak' | 'unclassified';
  hasMetrics: boolean;
  detectedMetrics: string[];
  metricCategories: string[];
  isXYZCompliant: boolean;
  isWeakStarter: boolean;
  detectedWeakStarter?: string;
  score: number; // 0-100
  feedback: string[];
}

export interface FactorScore {
  score: number; // 0-100
  weight: number;
  rating: 'exceptional' | 'proficient' | 'needs_work' | 'critical';
  details: string;
}

export interface CategoryBreakdown {
  quantifiedImpact: {
    score: number; // max 30
    max: number;
    impactDensity: number;
    quantifiedBullets: number;
    totalBullets: number;
    details: string;
  };
  skillIntegration: {
    score: number; // max 25
    max: number;
    integratedSkillRatio: number;
    integratedSkills: string[];
    missingSkills: string[];
    details: string;
  };
  verbStrength: {
    score: number; // max 20
    max: number;
    averageOwnership: number;
    strongBullets: number;
    neutralBullets: number;
    weakBullets: number;
    details: string;
  };
  structuralParseability: {
    score: number; // max 15
    max: number;
    dateScore: number;
    structureScore: number;
    lengthScore: number;
    details: string;
  };
  recruiterTargeting: {
    score: number; // max 10
    max: number;
    headlineScore: number;
    summaryScore: number;
    details: string;
  };
}

export interface AtsEvaluationResult {
  totalScore: number; // 0-100 (Primary modern score)
  compositeScore: number; // Backward-compatibility alias for totalScore
  categoryBreakdown: CategoryBreakdown;
  actionableFeedback: string[];
  priorityFixes: string[];
  factors: {
    impactMetrics: FactorScore;
    verbStrength: FactorScore;
    sectionCompleteness: FactorScore;
    readabilityIndex: FactorScore;
  };
  sectionBreakdown: {
    headline: { score: number; max: number; status: string; notes: string[] };
    summary: { score: number; max: number; status: string; notes: string[] };
    experience: { score: number; max: number; status: string; notes: string[] };
    skills: { score: number; max: number; status: string; notes: string[] };
    education: { score: number; max: number; status: string; notes: string[] };
  };
  bulletAudits: {
    company: string;
    title: string;
    audits: BulletAuditRecord[];
  }[];
  strengths: string[];
  weaknesses: string[];
  criticalRemediations: string[];
  actionablePlan: string[];
}

// ============================================================================
// Action Verbs & Starters Dictionaries
// ============================================================================

// Strong execution & ownership verbs (+1.0)
export const STRONG_ACTION_VERBS: ReadonlySet<string> = new Set([
  'engineered',
  'architected',
  'implemented',
  'built',
  'deployed',
  'automated',
  'refactored',
  'optimized',
  'designed',
  'integrated',
  'spearheaded',
  'launched',
  'orchestrated',
  'accelerated',
  'scaled',
  'delivered',
  're-architected',
  'overhauled',
  'pioneered',
  'modernized',
]);

// Neutral verbs (+0.5)
export const NEUTRAL_ACTION_VERBS: ReadonlySet<string> = new Set([
  'created',
  'maintained',
  'developed',
  'updated',
  'analyzed',
  'authored',
  'collaborated',
  'configured',
  'tested',
  'monitored',
  'produced',
  'scheduled',
]);

// Weak duty/passive openers (-1.0 penalty)
export const WEAK_STARTERS: readonly string[] = [
  'responsible for',
  'duties included',
  'worked on',
  'helped with',
  'assisted in',
  'assisted with',
  'participated in',
  'tasked with',
  'helped',
  'assisted',
  'handled',
  'involved in',
  'served as',
  'contributed to',
];

// ============================================================================
// Quantifiable Metric Detection Patterns
// ============================================================================

export const QUANTIFIED_METRIC_PATTERNS = {
  percentages: /\b\d+(?:\.\d+)?%|\d+%(?:\.\d+)?/i,
  latency: /\b\d+\s*(?:ms|s|seconds|queries\/sec|qps|rps)\b/i,
  scale: /\b\d+\s*(?:gb|tb|pb|users|req|dau|mau|records)\b|\b\d+[kKmMbBtT]?\s*(?:users|req|dau|mau|records|nodes|tps|events\/sec)\b|\b\d+\s*(?:k|m|b|million|billion)\s*(?:users|req|dau|mau|records)?\b/i,
  efficiency: /\b(?:reduced|increased|improved|scaled|saved|slashed|accelerated|cut)\s+.*?\d+/i,
  financialOrTeam: /[$€£]\s*\d+|\b\d+\s*(?:(?:senior|junior|lead|staff)\s+)?(?:engineers|members|stakeholders|direct reports)\b/i,
} as const;

const GLOBAL_METRIC_EXTRACTORS: readonly RegExp[] = [
  /[$€£]\s*(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?[kKmMbBtT]?\b/g,
  /\b\d+(?:\.\d+)?%/g,
  /\b\d+(?:\.\d+)?[xX]\b/g,
  /\b\d+(?:,\d{3})+\b/g,
  /\b\d+\s*(?:ms|s|seconds|queries\/sec|qps|rps)\b/gi,
  /\b\d+\s*(?:gb|tb|pb|users|req|dau|mau|records)\b/gi,
  /\b\d+[kKmMbBtT]?\s*(?:users|req|dau|mau|records|nodes|tps|events\/sec)\b/gi,
  /\b(?:reduced|increased|improved|scaled|saved|slashed|accelerated|cut)\s+.*?\d+/gi,
  /\b\d+\s*(?:(?:senior|junior|lead|staff)\s+)?(?:engineers|members|stakeholders|direct reports)\b/gi,
  /\b(?:managed|led|hired|mentored|supervising)\s+\d+\b/gi,
];

/**
 * Pure function: Extracts all quantifiable metrics from a text string.
 */
export function extractQuantifiableMetrics(text: string): string[] {
  const matches: string[] = [];
  for (const pattern of GLOBAL_METRIC_EXTRACTORS) {
    const found = text.match(pattern);
    if (found) {
      matches.push(...found);
    }
  }
  return Array.from(new Set(matches.map((m) => m.trim())));
}

/**
 * Checks whether a bullet point contains qualifying quantified metrics across the 5 categories.
 */
export function isBulletQuantified(text: string): {
  hasMetrics: boolean;
  categories: string[];
  metrics: string[];
} {
  const categories: string[] = [];
  if (QUANTIFIED_METRIC_PATTERNS.percentages.test(text)) categories.push('Percentages');
  if (QUANTIFIED_METRIC_PATTERNS.latency.test(text)) categories.push('Latency/Performance');
  if (QUANTIFIED_METRIC_PATTERNS.scale.test(text)) categories.push('Data/Scale volumes');
  if (QUANTIFIED_METRIC_PATTERNS.efficiency.test(text)) categories.push('Efficiency/Resource gains');
  if (QUANTIFIED_METRIC_PATTERNS.financialOrTeam.test(text)) categories.push('Team/Financial metrics');

  const metrics = extractQuantifiableMetrics(text);
  const hasMetrics = categories.length > 0 || metrics.length > 0;

  return { hasMetrics, categories, metrics };
}

/**
 * Pure function: Audits an individual bullet point.
 */
export function auditBullet(bullet: string): BulletAuditRecord {
  const trimmed = bullet.trim();
  const lower = trimmed.toLowerCase();
  const words = trimmed.split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  const detectedWeakStarter = WEAK_STARTERS.find((w) => lower.startsWith(w));
  const isWeakStarter = !!detectedWeakStarter;

  const firstWordMatch = trimmed.match(/^([a-zA-Z-]+)/);
  const firstWord = firstWordMatch ? firstWordMatch[1].toLowerCase() : '';

  let ownershipScore = 0.0;
  let ownershipCategory: BulletAuditRecord['ownershipCategory'] = 'unclassified';

  if (isWeakStarter) {
    ownershipScore = -1.0;
    ownershipCategory = 'weak';
  } else if (STRONG_ACTION_VERBS.has(firstWord)) {
    ownershipScore = 1.0;
    ownershipCategory = 'strong';
  } else if (NEUTRAL_ACTION_VERBS.has(firstWord)) {
    ownershipScore = 0.5;
    ownershipCategory = 'neutral';
  } else if (firstWord === 'helped' || firstWord === 'assisted') {
    ownershipScore = -1.0;
    ownershipCategory = 'weak';
  }

  const hasActionVerb = ownershipCategory === 'strong' || ownershipCategory === 'neutral';
  const { hasMetrics, categories: metricCategories, metrics } = isBulletQuantified(trimmed);

  // XYZ connector verification: "using", "by doing", "via", etc.
  const hasConnector =
    /\b(?:using|via|leveraging|through|utilizing|employing)\b|\bby\s+(?:doing|[a-zA-Z]+ing|[a-zA-Z]+ed)\b/i.test(
      trimmed
    );
  const isXYZCompliant = ownershipCategory === 'strong' && hasMetrics && hasConnector;

  const feedback: string[] = [];
  let score = 50;

  if (isWeakStarter) {
    score -= 30;
    feedback.push(`Replace weak duty starter ("${detectedWeakStarter}") with an assertive action verb.`);
  }

  if (ownershipCategory === 'strong') {
    score += 25;
  } else if (ownershipCategory === 'neutral') {
    score += 15;
    feedback.push(`Upgrade neutral verb ("${firstWord}") to a strong ownership verb (e.g. "Architected", "Engineered").`);
  } else if (!isWeakStarter) {
    feedback.push(`Begin bullet point with a high-impact action verb (e.g., "Engineered", "Architected", "Automated").`);
  }

  if (hasMetrics) {
    score += 25;
  } else {
    feedback.push(`Quantify impact with hard metrics (e.g., percentages, latency, scale, or cost reductions).`);
  }

  if (wordCount > 38) {
    feedback.push(`Bullet point is verbose (${wordCount} words). Condense to 12-32 words for optimal ATS parsing.`);
  } else if (wordCount < 7) {
    feedback.push(`Bullet point is too brief (${wordCount} words). Add technical depth and context.`);
  }

  if (isXYZCompliant) {
    score = 100;
  } else if (hasActionVerb && hasMetrics && !hasConnector) {
    feedback.push(`Connect the achievement to the technique using "by doing [Z]" to complete the Google XYZ format.`);
  }

  score = Math.max(0, Math.min(100, score));

  return {
    text: trimmed,
    wordCount,
    hasActionVerb,
    detectedActionVerb: hasActionVerb ? firstWord : undefined,
    ownershipScore,
    ownershipCategory,
    hasMetrics,
    detectedMetrics: metrics,
    metricCategories,
    isXYZCompliant,
    isWeakStarter,
    detectedWeakStarter,
    score,
    feedback,
  };
}

// ============================================================================
// 5-Pillar Modern Scoring Engines
// ============================================================================

/**
 * Pillar 1: Quantified Impact & Scale (30 Points Max)
 * >= 60% of bullets quantified: 30 pts
 * 40% - 59%: 22 pts
 * 20% - 39%: 14 pts
 * < 20%: 6 pts (0 if 0 bullets)
 */
export function evaluateQuantifiedImpact(bullets: string[]): {
  score: number;
  impactDensity: number;
  quantifiedCount: number;
  total: number;
  details: string;
} {
  const total = bullets.length;
  if (total === 0) {
    return {
      score: 0,
      impactDensity: 0,
      quantifiedCount: 0,
      total: 0,
      details: 'No experience bullets recorded to evaluate quantified impact.',
    };
  }

  let quantifiedCount = 0;
  for (const b of bullets) {
    if (isBulletQuantified(b).hasMetrics) {
      quantifiedCount++;
    }
  }

  const impactDensity = quantifiedCount / total;
  let score = 6;
  if (impactDensity >= 0.60) {
    score = 30;
  } else if (impactDensity >= 0.40) {
    score = 22;
  } else if (impactDensity >= 0.20) {
    score = 14;
  } else {
    score = 6;
  }

  return {
    score,
    impactDensity: Math.round(impactDensity * 100) / 100,
    quantifiedCount,
    total,
    details: `${quantifiedCount} of ${total} bullets (${Math.round(impactDensity * 100)}%) contain quantifiable metrics.`,
  };
}

/**
 * Helper to test if a skill appears in text with boundary safety.
 */
function isSkillInText(skill: string, text: string): boolean {
  const trimmed = skill.trim();
  if (!trimmed) return false;
  const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const prefix = /^\w/.test(trimmed) ? '\\b' : '';
  const suffix = /\w$/.test(trimmed) ? '\\b' : '';
  const regex = new RegExp(`${prefix}${escaped}${suffix}`, 'i');
  return regex.test(text);
}

/**
 * Pillar 2: Contextual Hard-Skill Integration (25 Points Max)
 * >= 65% of skills demonstrated in role descriptions: 25 pts
 * 45% - 64%: 18 pts
 * 25% - 44%: 10 pts
 * < 25%: 4 pts (0 if 0 skills)
 */
export function evaluateSkillIntegration(
  skills: string[],
  bulletTexts: string[]
): {
  score: number;
  ratio: number;
  integrated: string[];
  missing: string[];
  details: string;
} {
  const totalSkills = skills.length;
  if (totalSkills === 0) {
    return {
      score: 0,
      ratio: 0,
      integrated: [],
      missing: [],
      details: 'No skills listed in profile.',
    };
  }

  const combinedText = bulletTexts.join('\n');
  const integrated: string[] = [];
  const missing: string[] = [];

  for (const skill of skills) {
    if (isSkillInText(skill, combinedText)) {
      integrated.push(skill);
    } else {
      missing.push(skill);
    }
  }

  const ratio = integrated.length / totalSkills;
  let score = 4;
  if (ratio >= 0.65) {
    score = 25;
  } else if (ratio >= 0.45) {
    score = 18;
  } else if (ratio >= 0.25) {
    score = 10;
  } else {
    score = 4;
  }

  return {
    score,
    ratio: Math.round(ratio * 100) / 100,
    integrated,
    missing,
    details: `${integrated.length} of ${totalSkills} listed skills (${Math.round(ratio * 100)}%) are actively contextualized within experience bullets.`,
  };
}

/**
 * Pillar 3: Action Verb & Ownership Strength (20 Points Max)
 * Classifies verbs at the start of each bullet:
 * - Strong: +1.0
 * - Neutral: +0.5
 * - Weak / Passive: -1.0
 * Scaled to 20 points based on average ownership score per bullet.
 */
export function evaluateVerbStrength(bullets: string[]): {
  score: number;
  averageOwnership: number;
  strongCount: number;
  neutralCount: number;
  weakCount: number;
  details: string;
} {
  const total = bullets.length;
  if (total === 0) {
    return {
      score: 0,
      averageOwnership: 0,
      strongCount: 0,
      neutralCount: 0,
      weakCount: 0,
      details: 'No bullets recorded to evaluate verb ownership strength.',
    };
  }

  let totalOwnershipScore = 0;
  let strongCount = 0;
  let neutralCount = 0;
  let weakCount = 0;

  for (const b of bullets) {
    const audit = auditBullet(b);
    totalOwnershipScore += audit.ownershipScore;
    if (audit.ownershipCategory === 'strong') strongCount++;
    else if (audit.ownershipCategory === 'neutral') neutralCount++;
    else if (audit.ownershipCategory === 'weak') weakCount++;
  }

  const averageOwnership = totalOwnershipScore / total;
  // Scaled cleanly to 20 points: 1.0 avg -> 20 pts, 0.5 avg -> 10 pts, <= 0 -> 0 pts
  const score = Math.round(Math.max(0, Math.min(20, averageOwnership * 20)));

  return {
    score,
    averageOwnership: Math.round(averageOwnership * 100) / 100,
    strongCount,
    neutralCount,
    weakCount,
    details: `Average ownership score: ${averageOwnership.toFixed(2)}/1.0 (${strongCount} strong, ${neutralCount} neutral, ${weakCount} passive).`,
  };
}

/**
 * Pillar 4: Signal Density & Structural Parseability (15 Points Max)
 * - Experience recency & date presence: 5 pts
 * - Clean section heading alignment: 5 pts
 * - Bullet length compliance (12-32 words optimal): 5 pts
 */
export function evaluateStructuralParseability(
  profile: NormalizedProfile,
  bullets: string[]
): {
  score: number;
  dateScore: number;
  structureScore: number;
  lengthScore: number;
  details: string;
} {
  // 1. Recency & Date presence (5 pts)
  let dateScore = 0;
  if (profile.experiences.length > 0) {
    const hasDates = profile.experiences.some(
      (e) => Boolean(e.startDate || e.endDate || e.isCurrent || (e.description && /\b(20\d\d|19\d\d|present)\b/i.test(e.description)))
    );
    if (hasDates) dateScore = 5;
  }

  // 2. Clean section heading alignment (5 pts)
  let structureScore = 0;
  if (profile.experiences.length > 0) {
    const hasCleanStructure = profile.experiences.every((e) => Boolean(e.title?.trim() && e.company?.trim()));
    if (hasCleanStructure) structureScore = 5;
  }

  // 3. Bullet length compliance (5 pts)
  let lengthScore = 0;
  const totalBullets = bullets.length;
  if (totalBullets > 0) {
    let severeViolations = 0; // > 38 words or < 7 words
    let optimalCount = 0; // 12 to 32 words

    for (const b of bullets) {
      const w = b.trim().split(/\s+/).filter(Boolean).length;
      if (w > 38 || w < 7) {
        severeViolations++;
      }
      if (w >= 12 && w <= 32) {
        optimalCount++;
      }
    }

    const optimalRatio = optimalCount / totalBullets;
    if (severeViolations === 0 && optimalRatio >= 0.5) {
      lengthScore = 5;
    } else if (severeViolations === 0) {
      lengthScore = Math.max(3, Math.round(optimalRatio * 5));
    } else {
      lengthScore = Math.max(0, Math.min(5, Math.round(optimalRatio * 5) - severeViolations));
    }
  }

  const score = dateScore + structureScore + lengthScore;

  return {
    score,
    dateScore,
    structureScore,
    lengthScore,
    details: `Dates: ${dateScore}/5, Structure: ${structureScore}/5, Bullet Length Compliance: ${lengthScore}/5.`,
  };
}

/**
 * Pillar 5: Recruiter Search Targeting (10 Points Max)
 * - Headline check (5 pts): explicit title + primary technology/domain (not vague)
 * - Summary check (5 pts): 40 to 120 words summarizing specialization & stack
 */
export function evaluateRecruiterTargeting(profile: NormalizedProfile): {
  score: number;
  headlineScore: number;
  summaryScore: number;
  details: string;
} {
  // 1. Headline check (5 pts)
  const headline = (profile.headline || '').trim();
  let headlineScore = 0;

  if (headline.length > 0) {
    const vaguePattern = /\b(aspiring|seeking|looking for|open to|entry level|student|unemployed)\b/i;
    const isVague = vaguePattern.test(headline);

    const titleKeywords = /\b(engineer|developer|architect|lead|manager|scientist|consultant|specialist|analyst|designer|programmer|administrator)\b/i;
    const hasExplicitTitle = titleKeywords.test(headline);

    const hasDomainOrStructure =
      headline.includes('|') ||
      headline.includes('•') ||
      headline.includes('—') ||
      headline.includes('-') ||
      headline.length >= 25;

    if (!isVague && hasExplicitTitle && hasDomainOrStructure) {
      headlineScore = 5;
    } else if (!isVague && hasExplicitTitle) {
      headlineScore = 3;
    } else if (!isVague && headline.length >= 20) {
      headlineScore = 2;
    } else {
      headlineScore = 0;
    }
  }

  // 2. Summary check (5 pts)
  const summary = (profile.summary || '').trim();
  let summaryScore = 0;

  if (summary.length > 0) {
    const wordCount = summary.split(/\s+/).filter(Boolean).length;
    if (wordCount >= 40 && wordCount <= 120) {
      summaryScore = 5;
    } else if (wordCount > 120 && wordCount <= 250) {
      summaryScore = 3;
    } else if (wordCount < 40) {
      summaryScore = 2;
    } else {
      summaryScore = 2;
    }
  }

  const score = headlineScore + summaryScore;

  return {
    score,
    headlineScore,
    summaryScore,
    details: `Headline: ${headlineScore}/5, Summary Depth: ${summaryScore}/5.`,
  };
}

/**
 * Pure function: Evaluates Readability and Formatting Index (for factor compatibility)
 */
export function evaluateReadability(profile: NormalizedProfile): {
  score: number;
  notes: string[];
} {
  let score = 90;
  const notes: string[] = [];

  const nonAsciiCount = (profile.headline + (profile.summary || '')).replace(/[\x00-\x7F]/g, '').length;
  if (nonAsciiCount > 25) {
    score -= 15;
    notes.push('Excessive non-standard emoji or symbols detected; may interfere with legacy ATS parsers.');
  }

  const allCapsWords = (profile.headline + ' ' + (profile.summary || ''))
    .split(/\s+/)
    .filter((w) => w.length > 3 && w === w.toUpperCase() && /^[A-Z]+$/.test(w));

  if (allCapsWords.length > 5) {
    score -= 10;
    notes.push('Overuse of ALL-CAPS words found. Keep typography professional and consistent.');
  }

  let longBulletCount = 0;
  for (const exp of profile.experiences) {
    for (const b of exp.bulletPoints || []) {
      if (b.split(/\s+/).length > 45) {
        longBulletCount++;
      }
    }
  }

  if (longBulletCount > 2) {
    score -= 15;
    notes.push(`${longBulletCount} bullet points exceed 45 words; condense into concise 12-32 word statements.`);
  } else {
    notes.push('Bullet points maintain readable length and structure.');
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    notes,
  };
}

// ============================================================================
// Main Orchestration: evaluateProfileAts
// ============================================================================

/**
 * Pure functional ATS evaluation engine implementing the 5-pillar mathematical model.
 */
export function evaluateProfileAts(profile: NormalizedProfile): AtsEvaluationResult {
  const allBullets: string[] = [];
  const bulletAudits: AtsEvaluationResult['bulletAudits'] = [];
  const actionableFeedback: string[] = [];
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const criticalRemediations: string[] = [];
  const actionablePlan: string[] = [];

  // Extract all experience bullet points
  for (const exp of profile.experiences) {
    const bullets =
      exp.bulletPoints && exp.bulletPoints.length > 0
        ? exp.bulletPoints
        : exp.description
        ? exp.description.split('\n').filter((l) => l.trim().length > 15)
        : [];

    const audited = bullets.map((b) => {
      const record = auditBullet(b);
      allBullets.push(b);
      return record;
    });

    bulletAudits.push({
      company: exp.company,
      title: exp.title,
      audits: audited,
    });
  }

  // 1. Evaluate Pillars
  const p1 = evaluateQuantifiedImpact(allBullets);
  const p2 = evaluateSkillIntegration(profile.skills || [], allBullets);
  const p3 = evaluateVerbStrength(allBullets);
  const p4 = evaluateStructuralParseability(profile, allBullets);
  const p5 = evaluateRecruiterTargeting(profile);

  const totalScore = Math.max(0, Math.min(100, p1.score + p2.score + p3.score + p4.score + p5.score));

  // 2. Concrete Actionable Feedback
  for (const group of bulletAudits) {
    for (const b of group.audits) {
      if (b.isWeakStarter) {
        actionableFeedback.push(
          `In ${group.title} at ${group.company}: Identified passive verb "${b.detectedWeakStarter}". Replace with a strong ownership verb.`
        );
      }
      if (!b.hasMetrics) {
        actionableFeedback.push(
          `In ${group.title} at ${group.company}: Bullet "${b.text.slice(0, 60)}..." lacks quantifiable metrics (add %, scale, latency, or savings).`
        );
      }
    }
  }

  if (p2.missing.length > 0 && profile.skills.length > 0) {
    actionableFeedback.push(
      `Listed skills not demonstrated in experience descriptions: ${p2.missing.slice(0, 6).join(', ')}.`
    );
  }

  if (p5.headlineScore < 5) {
    actionableFeedback.push(
      'Headline lacks explicit target role or domain positioning. Formulate as "Title | Core Tech | Impact".'
    );
  }

  if (p5.summaryScore < 5) {
    actionableFeedback.push(
      'Summary is out of optimal range (40-120 words). Expand to summarize specialization, achievements, and core stack.'
    );
  }

  // 3. Ranked Priority Fixes (Top 3 highest-ROI changes)
  const candidateFixes = [
    {
      category: 'Quantified Impact & Scale',
      lostPoints: 30 - p1.score,
      recommendation: `Add quantifiable metrics (%, latency, scale, or financial gains) to at least 60% of experience bullets. Potential gain: +${30 - p1.score} pts.`,
    },
    {
      category: 'Hard-Skill Integration',
      lostPoints: 25 - p2.score,
      recommendation: `Demonstrate listed skills in role descriptions (${p2.missing.slice(0, 4).join(', ')}) to prove authentic experience. Potential gain: +${25 - p2.score} pts.`,
    },
    {
      category: 'Verb Ownership Strength',
      lostPoints: 20 - p3.score,
      recommendation: `Replace weak/passive openers with high-impact verbs ("Engineered", "Architected", "Automated"). Potential gain: +${20 - p3.score} pts.`,
    },
    {
      category: 'Structural Parseability',
      lostPoints: 15 - p4.score,
      recommendation: `Format bullets to optimal length (12-32 words) and verify clear dates on all experience entries. Potential gain: +${15 - p4.score} pts.`,
    },
    {
      category: 'Recruiter Search Targeting',
      lostPoints: 10 - p5.score,
      recommendation: `Optimize headline with explicit title + stack and tune summary to 40-120 words. Potential gain: +${10 - p5.score} pts.`,
    },
  ];

  candidateFixes.sort((a, b) => b.lostPoints - a.lostPoints);
  const priorityFixes = candidateFixes
    .filter((f) => f.lostPoints > 0)
    .slice(0, 3)
    .map((f) => f.recommendation);

  if (priorityFixes.length === 0) {
    priorityFixes.push('Maintain profile optimization and refresh metrics as new accomplishments occur.');
  }

  // 4. Strengths & Critical Remediations
  if (p1.score >= 22) strengths.push(`High impact density: ${Math.round(p1.impactDensity * 100)}% of bullets feature quantified metrics.`);
  else weaknesses.push(`Only ${Math.round(p1.impactDensity * 100)}% of bullets are quantified (target: >= 60%).`);

  if (p2.score >= 18) strengths.push(`Strong skill integration: ${Math.round(p2.ratio * 100)}% of skills validated in role narratives.`);
  else weaknesses.push(`${p2.missing.length} skills listed without in-context proof in experience bullets.`);

  if (p3.score >= 15) strengths.push(`Assertive ownership tone: ${p3.strongCount} bullets lead with high-impact execution verbs.`);
  else weaknesses.push(`Passive or duty-oriented phrasing detected across bullets.`);

  if (profile.headline && p5.headlineScore === 5) strengths.push('Headline is cleanly targeted with explicit role and domain.');
  else if (!profile.headline) criticalRemediations.push('Headline is completely missing. Add a target title and value proposition.');

  if (profile.summary && p5.summaryScore === 5) strengths.push('Summary is concise and within the optimal 40-120 word window.');
  else if (!profile.summary) criticalRemediations.push('About section is empty. Create a professional narrative summarizing your expertise.');

  if (profile.experiences.length === 0) criticalRemediations.push('No work experience entries recorded. Add roles with quantifiable bullet points.');
  if (profile.skills.length === 0) criticalRemediations.push('Skills section is empty. ATS search relies on skill indexing.');

  actionablePlan.push(...priorityFixes);

  // Backward compatibility factors
  const readability = evaluateReadability(profile);
  const getRating = (val: number): FactorScore['rating'] => {
    if (val >= 80) return 'exceptional';
    if (val >= 60) return 'proficient';
    if (val >= 40) return 'needs_work';
    return 'critical';
  };

  const factors = {
    impactMetrics: {
      score: Math.round((p1.score / 30) * 100),
      weight: 0.30,
      rating: getRating(Math.round((p1.score / 30) * 100)),
      details: p1.details,
    },
    verbStrength: {
      score: Math.round((p3.score / 20) * 100),
      weight: 0.20,
      rating: getRating(Math.round((p3.score / 20) * 100)),
      details: p3.details,
    },
    sectionCompleteness: {
      score: Math.round(((p2.score + p4.score) / 40) * 100),
      weight: 0.35,
      rating: getRating(Math.round(((p2.score + p4.score) / 40) * 100)),
      details: `${p2.details} ${p4.details}`,
    },
    readabilityIndex: {
      score: Math.round((p5.score / 10) * 100),
      weight: 0.15,
      rating: getRating(Math.round((p5.score / 10) * 100)),
      details: `${p5.details} Readability score: ${readability.score}/100.`,
    },
  };

  const categoryBreakdown: CategoryBreakdown = {
    quantifiedImpact: {
      score: p1.score,
      max: 30,
      impactDensity: p1.impactDensity,
      quantifiedBullets: p1.quantifiedCount,
      totalBullets: p1.total,
      details: p1.details,
    },
    skillIntegration: {
      score: p2.score,
      max: 25,
      integratedSkillRatio: p2.ratio,
      integratedSkills: p2.integrated,
      missingSkills: p2.missing,
      details: p2.details,
    },
    verbStrength: {
      score: p3.score,
      max: 20,
      averageOwnership: p3.averageOwnership,
      strongBullets: p3.strongCount,
      neutralBullets: p3.neutralCount,
      weakBullets: p3.weakCount,
      details: p3.details,
    },
    structuralParseability: {
      score: p4.score,
      max: 15,
      dateScore: p4.dateScore,
      structureScore: p4.structureScore,
      lengthScore: p4.lengthScore,
      details: p4.details,
    },
    recruiterTargeting: {
      score: p5.score,
      max: 10,
      headlineScore: p5.headlineScore,
      summaryScore: p5.summaryScore,
      details: p5.details,
    },
  };

  const sectionBreakdown = {
    headline: {
      score: Math.round((p5.headlineScore / 5) * 100),
      max: 100,
      status: p5.headlineScore === 5 ? 'Proficient' : 'Needs Optimization',
      notes: [p5.details],
    },
    summary: {
      score: Math.round((p5.summaryScore / 5) * 100),
      max: 100,
      status: p5.summaryScore === 5 ? 'Proficient' : 'Needs Optimization',
      notes: [p5.details],
    },
    experience: {
      score: Math.round(((p1.score + p3.score) / 50) * 100),
      max: 100,
      status: p1.score + p3.score >= 38 ? 'Proficient' : 'Needs Optimization',
      notes: [p1.details, p3.details],
    },
    skills: {
      score: Math.round((p2.score / 25) * 100),
      max: 100,
      status: p2.score >= 18 ? 'Proficient' : 'Needs Optimization',
      notes: [p2.details],
    },
    education: {
      score: profile.education && profile.education.length > 0 ? 100 : 0,
      max: 100,
      status: profile.education && profile.education.length > 0 ? 'Proficient' : 'Needs Optimization',
      notes: [profile.education && profile.education.length > 0 ? 'Education credentials recorded.' : 'No education listed.'],
    },
  };

  return {
    totalScore,
    compositeScore: totalScore,
    categoryBreakdown,
    actionableFeedback,
    priorityFixes,
    factors,
    sectionBreakdown,
    bulletAudits,
    strengths,
    weaknesses,
    criticalRemediations,
    actionablePlan,
  };
}
