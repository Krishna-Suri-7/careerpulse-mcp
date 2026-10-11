import { NormalizedProfile, NormalizedExperience } from '../contracts/profile-schema.js';

export interface BulletAuditRecord {
  text: string;
  hasActionVerb: boolean;
  detectedActionVerb?: string;
  hasMetrics: boolean;
  detectedMetrics: string[];
  isXYZCompliant: boolean;
  isWeakStarter: boolean;
  detectedWeakStarter?: string;
  score: number; // 0-100
  feedback: string[];
}

export interface FactorScore {
  score: number; // 0-100
  weight: number; // e.g. 0.35
  rating: 'exceptional' | 'proficient' | 'needs_work' | 'critical';
  details: string;
}

export interface AtsEvaluationResult {
  compositeScore: number; // 0-100
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

// Strong action verbs dictionary (O(1) Set lookup)
export const STRONG_ACTION_VERBS: ReadonlySet<string> = new Set([
  'accelerated', 'achieved', 'administered', 'advised', 'advocated', 'aligned', 'allocated',
  'amplified', 'analyzed', 'applied', 'architected', 'assembled', 'authored', 'automated',
  'benchmarked', 'built', 'centralized', 'championed', 'coached', 'collaborated', 'commissioned',
  'configured', 'consolidated', 'constructed', 'converted', 'coordinated', 'crafted', 'created',
  'cultivated', 'customized', 'debugged', 'decreased', 'delivered', 'deployed', 'designed',
  'developed', 'devised', 'diagnosed', 'directed', 'documented', 'doubled', 'drafted',
  'drove', 'eliminated', 'enabled', 'enacted', 'engineered', 'enhanced', 'established',
  'evaluated', 'executed', 'expanded', 'expedited', 'facilitated', 'focused', 'forecasted',
  'formulated', 'fostered', 'founded', 'generated', 'governed', 'guided', 'halved',
  'harnessed', 'headed', 'identified', 'implemented', 'improved', 'increased', 'incubated',
  'influenced', 'initiated', 'innovated', 'inspected', 'instituted', 'integrated', 'intensified',
  'introduced', 'invented', 'investigated', 'launched', 'led', 'leveraged', 'maximized',
  'mentored', 'migrated', 'minimized', 'modernized', 'monitored', 'motivated', 'negotiated',
  'operated', 'optimized', 'orchestrated', 'organized', 'overhauled', 'oversaw', 'partnered',
  'pioneered', 'planned', 'prioritized', 'produced', 'programmed', 'promoted', 'proposed',
  'prototyped', 'published', 're-architected', 'realigned', 'rebuilt', 'recruited', 'redesigned',
  'reduced', 'refactored', 'refined', 'reformed', 'remodeled', 'reorganized', 'replaced',
  'resolved', 'restructured', 'revamped', 'revitalized', 'revolutionized', 'scaled', 'scheduled',
  'secured', 'simplified', 'slashed', 'solved', 'spearheaded', 'standardized', 'steered',
  'streamlined', 'strengthened', 'structured', 'surpassed', 'systematized', 'tested', 'tracked',
  'transformed', 'transitioned', 'tripled', 'troubleshot', 'unified', 'upgraded', 'validated',
  'yielded',
]);

// Weak duty-focused opening phrases
export const WEAK_STARTERS: readonly string[] = [
  'responsible for',
  'duties included',
  'worked on',
  'helped with',
  'assisted in',
  'assisted with',
  'participated in',
  'handled',
  'tasked with',
  'involved in',
  'served as',
  'contributed to',
];

// Pre-compiled regex patterns for quantifiable metrics
const METRIC_PATTERNS: readonly RegExp[] = [
  /[€£$](?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?[kKmMbBtT]?\b/g, // Currencies: $500k, €200k, £50k
  /\b\d+(?:\.\d+)?%/g, // Percentages: 45%, 99.9%
  /\b\d+(?:\.\d+)?[xX]\b/g, // Multipliers: 2x, 10x
  /\b\d+(?:,\d{3})+\b/g, // Large numbers: 100,000
  /\b\d+\s*(?:k|m|b|million|billion|thousand|users|clients|customers|requests|req\/s|qps|rps|ms|seconds|minutes|hours|days|weeks|months|years)\b/gi,
  /\b(?:reduced|increased|decreased|improved|grew|saved)\s+by\s+\d+/gi,
  /\b(?:team of|managed|led|hired|mentored|supervising)\s+\d+\b/gi, // Headcounts & team scale
  /\b\d+\s+(?:direct reports|engineers|developers|people|team members|staff|headcount)\b/gi, // Headcounts
];

/**
 * Pure function: Extracts all quantifiable metrics from a bullet string
 */
export function extractQuantifiableMetrics(text: string): string[] {
  const matches: string[] = [];
  for (const pattern of METRIC_PATTERNS) {
    const found = text.match(pattern);
    if (found) {
      matches.push(...found);
    }
  }
  return Array.from(new Set(matches));
}

/**
 * Pure function: Audits an individual bullet point against the Google XYZ framework
 */
export function auditBullet(bullet: string): BulletAuditRecord {
  const trimmed = bullet.trim();
  const lower = trimmed.toLowerCase();

  const detectedWeakStarter = WEAK_STARTERS.find((w) => lower.startsWith(w));
  const isWeakStarter = !!detectedWeakStarter;

  const firstWordMatch = trimmed.match(/^([a-zA-Z-]+)/);
  const firstWord = firstWordMatch ? firstWordMatch[1].toLowerCase() : '';
  const hasActionVerb = STRONG_ACTION_VERBS.has(firstWord);

  const metrics = extractQuantifiableMetrics(trimmed);
  const hasMetrics = metrics.length > 0;

  // XYZ framework: Action verb + quantifiable metric + method/technique connector (avoiding "by [number]" which is a metric clause)
  const hasConnector = /\b(?:using|via|leveraging|through|utilizing|employing)\b|\bby\s+(?:doing|[a-zA-Z]+ing|[a-zA-Z]+ed)\b/i.test(trimmed);
  const isXYZCompliant = hasActionVerb && hasMetrics && hasConnector;

  const feedback: string[] = [];
  let score = 50;

  if (isWeakStarter) {
    score -= 30;
    feedback.push(`Replace weak duty starter ("${detectedWeakStarter}") with an assertive action verb.`);
  }

  if (hasActionVerb) {
    score += 25;
  } else {
    feedback.push(`Begin bullet point with a high-impact action verb (e.g., "Engineered", "Orchestrated", "Spearheaded").`);
  }

  if (hasMetrics) {
    score += 25;
  } else {
    feedback.push(`Quantify impact with hard metrics (e.g., "reduced latency by 45%", "scaled to 10M DAU").`);
  }

  if (isXYZCompliant) {
    score = 100;
  } else if (hasActionVerb && hasMetrics && !hasConnector) {
    feedback.push(`Connect the achievement to the technique using "by doing [Z]" to complete the Google XYZ format.`);
  }

  score = Math.max(0, Math.min(100, score));

  return {
    text: trimmed,
    hasActionVerb,
    detectedActionVerb: hasActionVerb ? firstWord : undefined,
    hasMetrics,
    detectedMetrics: metrics,
    isXYZCompliant,
    isWeakStarter,
    detectedWeakStarter,
    score,
    feedback,
  };
}

/**
 * Pure function: Evaluates Readability and Formatting Index
 */
export function evaluateReadability(profile: NormalizedProfile): {
  score: number;
  notes: string[];
} {
  let score = 90;
  const notes: string[] = [];

  // Excessive symbols or non-ASCII characters
  const nonAsciiCount = (profile.headline + (profile.summary || '')).replace(/[\x00-\x7F]/g, '').length;
  if (nonAsciiCount > 25) {
    score -= 15;
    notes.push('Excessive non-standard emoji or symbols detected; may interfere with legacy ATS parsers.');
  }

  // All-caps words check
  const allCapsWords = (profile.headline + ' ' + (profile.summary || ''))
    .split(/\s+/)
    .filter((w) => w.length > 3 && w === w.toUpperCase() && /^[A-Z]+$/.test(w));

  if (allCapsWords.length > 5) {
    score -= 10;
    notes.push('Overuse of ALL-CAPS words found. Keep typography professional and consistent.');
  }

  // Check bullet point lengths
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
    notes.push(`${longBulletCount} bullet points exceed 45 words; condense into concise 15-30 word statements.`);
  } else {
    notes.push('Bullet points maintain readable length and structure.');
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    notes,
  };
}

/**
 * Pure function: Evaluates profile across ATS dimensions
 */
export function evaluateProfileAts(profile: NormalizedProfile): AtsEvaluationResult {
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const criticalRemediations: string[] = [];
  const actionablePlan: string[] = [];

  // 1. Headline Evaluation (Max 100)
  const headline = (profile.headline || '').trim();
  let headlineScore = 0;
  const headlineNotes: string[] = [];

  if (headline.length === 0) {
    criticalRemediations.push('Headline is completely missing. Add a target title and value proposition.');
  } else {
    headlineScore += 40;
    if (headline.length >= 40 && headline.length <= 220) {
      headlineScore += 30;
      strengths.push(`Headline length (${headline.length} chars) is within the optimal 40-220 character range.`);
    } else if (headline.length < 40) {
      weaknesses.push('Headline is overly brief; expand with core skills and impact.');
      headlineNotes.push('Expand headline to include core technology stack and target role title.');
    } else {
      headlineNotes.push('Headline exceeds 220 characters and may be clipped on mobile.');
    }

    if (headline.includes('|') || headline.includes('•') || headline.includes('—')) {
      headlineScore += 30;
      strengths.push('Headline uses structured multi-part positioning (Role | Tech | Impact).');
    } else {
      headlineNotes.push('Use pipe or bullet separators for clear multi-part structure.');
    }
  }

  // 2. Summary / About Evaluation (Max 100)
  const summary = (profile.summary || '').trim();
  let summaryScore = 0;
  const summaryNotes: string[] = [];

  if (summary.length === 0) {
    criticalRemediations.push('About section is empty. Create a professional narrative summarizing your expertise.');
  } else {
    summaryScore += 40;
    const wordCount = summary.split(/\s+/).length;

    if (wordCount >= 100 && wordCount <= 450) {
      summaryScore += 40;
      strengths.push(`About section has strong narrative depth (${wordCount} words).`);
    } else if (wordCount < 100) {
      summaryScore += 20;
      weaknesses.push('About section is underdeveloped (<100 words).');
      summaryNotes.push('Expand summary to 150-300 words with career highlights and tech competencies.');
    } else {
      summaryScore += 30;
      summaryNotes.push('About section is verbose (>450 words); ensure key value proposition is visible above the fold.');
    }

    if (summary.includes('@') || summary.toLowerCase().includes('contact') || summary.toLowerCase().includes('reach')) {
      summaryScore += 20;
      strengths.push('About section includes direct contact information or call to action.');
    } else {
      summaryNotes.push('Include a direct email or call to action at the conclusion of the About section.');
    }
  }

  // 3. Work Experience & Bullet Points Evaluation
  let totalBullets = 0;
  let actionVerbBullets = 0;
  let metricBullets = 0;
  let xyzBullets = 0;
  let expScore = 0;
  const expNotes: string[] = [];
  const bulletAudits: AtsEvaluationResult['bulletAudits'] = [];

  if (profile.experiences.length === 0) {
    criticalRemediations.push('No work experience entries recorded. Add roles with quantifiable bullet points.');
  } else {
    expScore += 30;
    if (profile.experiences.length >= 2) expScore += 20;

    for (const exp of profile.experiences) {
      const bullets = (exp.bulletPoints && exp.bulletPoints.length > 0)
        ? exp.bulletPoints
        : exp.description
        ? exp.description.split('\n').filter((l) => l.trim().length > 15)
        : [];

      const audited = bullets.map(auditBullet);

      for (const a of audited) {
        totalBullets++;
        if (a.hasActionVerb) actionVerbBullets++;
        if (a.hasMetrics) metricBullets++;
        if (a.isXYZCompliant) xyzBullets++;
      }

      bulletAudits.push({
        company: exp.company,
        title: exp.title,
        audits: audited,
      });
    }

    if (totalBullets === 0) {
      weaknesses.push('Work experience lacks bulleted achievement descriptions.');
      expNotes.push('Deconstruct job responsibilities into 3-5 achievement bullets per role.');
    } else {
      const actionRatio = actionVerbBullets / totalBullets;
      const metricRatio = metricBullets / totalBullets;
      const qualityScore = Math.round((actionRatio * 25) + (metricRatio * 25));
      expScore += qualityScore;

      if (actionRatio >= 0.7) {
        strengths.push(`${Math.round(actionRatio * 100)}% of bullets begin with high-impact action verbs.`);
      } else {
        weaknesses.push(`Only ${Math.round(actionRatio * 100)}% of bullets begin with action verbs.`);
        actionablePlan.push('Replace passive voice in job descriptions with past-tense action verbs.');
      }

      if (metricRatio >= 0.5) {
        strengths.push(`${Math.round(metricRatio * 100)}% of bullets feature quantifiable metrics.`);
      } else {
        weaknesses.push(`Only ${Math.round(metricRatio * 100)}% of bullets contain quantifiable metrics.`);
        actionablePlan.push('Add measurable numbers (%, $, scale, velocity) across at least 50% of experience bullets.');
      }
    }
  }

  // 4. Skills Section Evaluation
  let skillsScore = 0;
  const skillsNotes: string[] = [];
  const skillsCount = profile.skills.length;

  if (skillsCount === 0) {
    criticalRemediations.push('Skills section is empty. ATS search relies on skill indexing.');
  } else if (skillsCount < 5) {
    skillsScore = 40;
    weaknesses.push(`Only ${skillsCount} skills listed. Add at least 10-15 key skills.`);
    skillsNotes.push('Expand skills list towards 15-25 competencies to increase recruiter search appearances.');
  } else if (skillsCount < 15) {
    skillsScore = 75;
    strengths.push(`Good foundational skills list (${skillsCount} skills).`);
    skillsNotes.push('Aim for 15-30 categorized skills for comprehensive ATS coverage.');
  } else {
    skillsScore = 100;
    strengths.push(`Strong skills inventory (${skillsCount} skills).`);
  }

  // 5. Education Section Evaluation
  let eduScore = 0;
  const eduNotes: string[] = [];

  if (profile.education.length === 0) {
    weaknesses.push('No education history provided.');
    eduNotes.push('Include degrees, institutions, and graduation years.');
  } else {
    eduScore += 70;
    if (profile.education.some((e) => !!e.degree)) {
      eduScore += 30;
      strengths.push('Education includes explicit degree credentials.');
    } else {
      eduNotes.push('Specify degree and major on education entries.');
    }
  }

  // Factor Scores Calculation (0-100)
  // 1. Impact Metrics Factor
  const impactMetricsVal = totalBullets > 0
    ? Math.round((metricBullets / totalBullets) * 100)
    : 0;

  // 2. Verb Strength Factor
  const verbStrengthVal = totalBullets > 0
    ? Math.round((actionVerbBullets / totalBullets) * 100)
    : 0;

  // 3. Section Completeness Factor (Weighted)
  const completenessVal = Math.round(
    headlineScore * 0.2 +
    summaryScore * 0.2 +
    expScore * 0.35 +
    skillsScore * 0.15 +
    eduScore * 0.1
  );

  // 4. Readability Index Factor
  const readability = evaluateReadability(profile);

  // Composite Score (0-100)
  // Weights: Impact Metrics (35%), Verb Strength (30%), Completeness (25%), Readability (10%)
  const compositeScore = Math.round(
    impactMetricsVal * 0.35 +
    verbStrengthVal * 0.30 +
    completenessVal * 0.25 +
    readability.score * 0.10
  );

  const getRating = (val: number): FactorScore['rating'] => {
    if (val >= 80) return 'exceptional';
    if (val >= 60) return 'proficient';
    if (val >= 40) return 'needs_work';
    return 'critical';
  };

  return {
    compositeScore: Math.max(0, Math.min(100, compositeScore)),
    factors: {
      impactMetrics: {
        score: impactMetricsVal,
        weight: 0.35,
        rating: getRating(impactMetricsVal),
        details: `${metricBullets} of ${totalBullets} bullet points contain measurable metrics.`,
      },
      verbStrength: {
        score: verbStrengthVal,
        weight: 0.30,
        rating: getRating(verbStrengthVal),
        details: `${actionVerbBullets} of ${totalBullets} bullet points initiate with strong action verbs.`,
      },
      sectionCompleteness: {
        score: completenessVal,
        weight: 0.25,
        rating: getRating(completenessVal),
        details: 'Evaluates presence and depth of Headline, About, Roles, Skills, and Education.',
      },
      readabilityIndex: {
        score: readability.score,
        weight: 0.10,
        rating: getRating(readability.score),
        details: readability.notes.join(' '),
      },
    },
    sectionBreakdown: {
      headline: {
        score: headlineScore,
        max: 100,
        status: headlineScore >= 80 ? 'Proficient' : 'Needs Optimization',
        notes: headlineNotes,
      },
      summary: {
        score: summaryScore,
        max: 100,
        status: summaryScore >= 80 ? 'Proficient' : 'Needs Optimization',
        notes: summaryNotes,
      },
      experience: {
        score: expScore,
        max: 100,
        status: expScore >= 80 ? 'Proficient' : 'Needs Optimization',
        notes: expNotes,
      },
      skills: {
        score: skillsScore,
        max: 100,
        status: skillsScore >= 80 ? 'Proficient' : 'Needs Optimization',
        notes: skillsNotes,
      },
      education: {
        score: eduScore,
        max: 100,
        status: eduScore >= 80 ? 'Proficient' : 'Needs Optimization',
        notes: eduNotes,
      },
    },
    bulletAudits,
    strengths,
    weaknesses,
    criticalRemediations,
    actionablePlan,
  };
}
