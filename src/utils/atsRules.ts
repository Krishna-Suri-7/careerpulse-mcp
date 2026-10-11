import { LinkedInProfile, Experience } from '../schemas/profile.js';

export interface BulletAudit {
  original: string;
  hasActionVerb: boolean;
  detectedActionVerb?: string;
  hasMetrics: boolean;
  detectedMetrics: string[];
  isXYZCompliant: boolean;
  isWeak: boolean;
  feedback: string[];
}

export interface SectionScore {
  name: string;
  score: number;
  maxScore: number;
  status: 'excellent' | 'good' | 'needs_improvement' | 'critical';
  feedback: string[];
}

export interface ProfileAuditResult {
  overallScore: number; // 0-100
  atsReadabilityScore: number; // 0-100
  bulletQualityScore: number; // 0-100
  sectionScores: Record<string, SectionScore>;
  strengths: string[];
  weaknesses: string[];
  bulletAudits: {
    experienceIndex: number;
    company: string;
    title: string;
    bullets: BulletAudit[];
  }[];
  criticalIssues: string[];
  actionableRecommendations: string[];
}

// Strong action verbs list
export const STRONG_ACTION_VERBS = new Set([
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

export const WEAK_STARTERS = [
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

// Patterns for metrics (numbers, percentages, currencies, multipliers, data volumes)
const METRIC_PATTERNS = [
  /\b\d+(?:\.\d+)?%/g, // 35%, 12.5%
  /\$(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?[kKmMbBtT]?\b/g, // $500k, $2.5M
  /\b€(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?[kKmMbBtT]?\b/g, // €100k
  /\b£(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?[kKmMbBtT]?\b/g, // £100k
  /\b\d+(?:\.\d+)?[xX]\b/g, // 2x, 10x, 3.5x
  /\b\d+(?:,\d{3})+\b/g, // 100,000
  /\b\d+\s*(?:k|m|b|million|billion|thousand|users|clients|customers|requests|req\/s|qps|rps|ms|seconds|minutes|hours|days|weeks|months|years)\b/gi,
  /\b(?:reduced|increased|decreased|improved|grew|saved)\s+by\s+\d+/gi,
];

/**
 * Checks if a bullet point has quantifiable metrics
 */
export function extractMetrics(bullet: string): string[] {
  const matches: string[] = [];
  for (const pattern of METRIC_PATTERNS) {
    const found = bullet.match(pattern);
    if (found) {
      matches.push(...found);
    }
  }
  return Array.from(new Set(matches));
}

/**
 * Evaluates a single experience bullet point
 */
export function auditBulletPoint(bullet: string): BulletAudit {
  const trimmed = bullet.trim();
  const lower = trimmed.toLowerCase();

  // Check weak starters
  const hasWeakStarter = WEAK_STARTERS.some((weak) => lower.startsWith(weak));

  // Extract first word
  const firstWordMatch = trimmed.match(/^([a-zA-Z-]+)/);
  const firstWord = firstWordMatch ? firstWordMatch[1].toLowerCase() : '';

  const hasActionVerb = STRONG_ACTION_VERBS.has(firstWord);
  const metrics = extractMetrics(trimmed);
  const hasMetrics = metrics.length > 0;

  // XYZ formula check: Accomplished [X] measured by [Y] by doing [Z]
  // Indicators: Action verb + metric + method/technique ("by", "using", "via", "leveraging", "through")
  const hasMethodConnector = /\b(?:by|using|via|leveraging|through|utilizing|employing)\b/i.test(trimmed);
  const isXYZCompliant = hasActionVerb && hasMetrics && hasMethodConnector;

  const isWeak = hasWeakStarter || (!hasActionVerb && !hasMetrics) || trimmed.length < 25;

  const feedback: string[] = [];
  if (hasWeakStarter) {
    feedback.push(`Replace weak duty phrase ("${WEAK_STARTERS.find((w) => lower.startsWith(w))}") with a strong action verb.`);
  }
  if (!hasActionVerb) {
    feedback.push(`Start with a strong past-tense action verb (e.g., "Engineered", "Orchestrated", "Spearheaded").`);
  }
  if (!hasMetrics) {
    feedback.push(`Quantify the impact with numbers, percentages, scale, or dollar amounts (e.g., "reduced latency by 40%", "scaled to 5M DAU").`);
  }
  if (!hasMethodConnector && hasMetrics && hasActionVerb) {
    feedback.push(`Adopt Google's XYZ formula: specify how it was achieved using "by doing [Z]" or "leveraging [tech]".`);
  }

  return {
    original: trimmed,
    hasActionVerb,
    detectedActionVerb: hasActionVerb ? firstWord : undefined,
    hasMetrics,
    detectedMetrics: metrics,
    isXYZCompliant,
    isWeak,
    feedback,
  };
}

/**
 * Runs a comprehensive profile audit
 */
export function auditLinkedInProfile(profile: LinkedInProfile): ProfileAuditResult {
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const criticalIssues: string[] = [];
  const actionableRecommendations: string[] = [];

  // 1. Headline Audit (max 15 pts)
  const headline = (profile.headline || '').trim();
  let headlineScore = 0;
  const headlineFeedback: string[] = [];

  if (headline.length === 0) {
    criticalIssues.push('Profile headline is missing completely.');
    headlineFeedback.push('Add a compelling professional headline.');
  } else {
    headlineScore += 5; // Base presence
    if (headline.length >= 40 && headline.length <= 220) {
      headlineScore += 5;
      strengths.push(`Headline is of optimal length (${headline.length} chars).`);
    } else if (headline.length < 40) {
      headlineFeedback.push('Headline is too short. Include target job title, core tech stack, and unique value proposition.');
      weaknesses.push('Headline lacks depth or keywords.');
    } else {
      headlineFeedback.push('Headline exceeds 220 characters and may get truncated.');
    }

    // Check separator pipes or keywords
    if (headline.includes('|') || headline.includes('•') || headline.includes('—')) {
      headlineScore += 5;
      strengths.push('Headline uses structured multi-part positioning (Role | Tech | Value).');
    } else {
      headlineScore += 2;
      headlineFeedback.push('Consider using pipe separators (e.g., "Senior Software Engineer | Distributed Systems | Node.js, Go, AWS") for clarity.');
    }
  }

  // 2. Summary / About Audit (max 15 pts)
  const summary = (profile.summary || '').trim();
  let summaryScore = 0;
  const summaryFeedback: string[] = [];

  if (summary.length === 0) {
    criticalIssues.push('About/Summary section is missing.');
    summaryFeedback.push('Add an About section to tell your career story, showcase technical expertise, and provide contact details.');
  } else {
    summaryScore += 5; // Base presence
    const wordCount = summary.split(/\s+/).length;

    if (wordCount >= 100 && wordCount <= 450) {
      summaryScore += 7;
      strengths.push(`About section has strong narrative depth (${wordCount} words).`);
    } else if (wordCount < 100) {
      summaryScore += 3;
      weaknesses.push('About section is very brief; expand on your technical journey and career achievements.');
      summaryFeedback.push('Expand your About section to at least 150-250 words highlighting key career milestones.');
    } else {
      summaryScore += 5;
      summaryFeedback.push('About section is lengthy (>450 words); ensure key points and call-to-action are visible before the "see more" cutoff.');
    }

    if (summary.includes('@') || summary.toLowerCase().includes('contact') || summary.toLowerCase().includes('email')) {
      summaryScore += 3;
      strengths.push('About section includes direct contact information or call to action.');
    } else {
      summaryFeedback.push('Include an email or clear call-to-action at the end of the About section.');
    }
  }

  // 3. Experience & Bullet Points Audit (max 35 pts)
  let experienceScore = 0;
  const experienceFeedback: string[] = [];
  const bulletAudits: ProfileAuditResult['bulletAudits'] = [];

  let totalBullets = 0;
  let actionVerbBullets = 0;
  let metricBullets = 0;
  let xyzCompliantBullets = 0;

  if (profile.experiences.length === 0) {
    criticalIssues.push('No work experience entries found.');
    experienceFeedback.push('Add your professional experience records with detailed impact-driven bullet points.');
  } else {
    experienceScore += 10; // Base presence
    if (profile.experiences.length >= 2) {
      experienceScore += 5;
    }

    profile.experiences.forEach((exp, idx) => {
      const bullets = (exp.bulletPoints && exp.bulletPoints.length > 0)
        ? exp.bulletPoints
        : exp.description
        ? exp.description.split('\n').filter((l) => l.trim().length > 15)
        : [];

      const expAudit = {
        experienceIndex: idx,
        company: exp.company,
        title: exp.title,
        bullets: bullets.map(auditBulletPoint),
      };

      for (const b of expAudit.bullets) {
        totalBullets++;
        if (b.hasActionVerb) actionVerbBullets++;
        if (b.hasMetrics) metricBullets++;
        if (b.isXYZCompliant) xyzCompliantBullets++;
      }

      bulletAudits.push(expAudit);
    });

    if (totalBullets === 0) {
      weaknesses.push('Experience entries lack itemized bullet points or descriptions.');
      experienceFeedback.push('Break down job descriptions into 3-5 bullet points per role highlighting concrete achievements.');
    } else {
      const actionRatio = actionVerbBullets / totalBullets;
      const metricRatio = metricBullets / totalBullets;

      // Score up to 20 points for bullet quality
      const bulletQualityVal = Math.round((actionRatio * 10) + (metricRatio * 10));
      experienceScore += Math.min(20, bulletQualityVal);

      if (actionRatio >= 0.7) {
        strengths.push(`${Math.round(actionRatio * 100)}% of bullet points start with strong action verbs.`);
      } else {
        weaknesses.push(`Only ${Math.round(actionRatio * 100)}% of bullet points start with action verbs.`);
        actionableRecommendations.push('Rewrite passive bullet points with strong action verbs (e.g. Architected, Engineered, Streamlined).');
      }

      if (metricRatio >= 0.5) {
        strengths.push(`${Math.round(metricRatio * 100)}% of bullet points contain quantifiable metrics.`);
      } else {
        weaknesses.push(`Only ${Math.round(metricRatio * 100)}% of bullet points include quantifiable metrics.`);
        actionableRecommendations.push('Incorporate measurable metrics (%, $, scale, users, latency) across at least 50% of your experience bullets.');
      }
    }
  }

  // 4. Skills Audit (max 20 pts)
  let skillsScore = 0;
  const skillsFeedback: string[] = [];
  const skillsCount = profile.skills.length;

  if (skillsCount === 0) {
    criticalIssues.push('Skills section is empty.');
    skillsFeedback.push('Add at least 5-15 relevant hard and soft skills for ATS indexing.');
  } else if (skillsCount < 5) {
    skillsScore = 8;
    weaknesses.push(`Only ${skillsCount} skills listed. Recruiters frequently search by skill keywords.`);
    skillsFeedback.push('Add at least 10-20 technical and domain skills to improve LinkedIn search discovery.');
  } else if (skillsCount < 15) {
    skillsScore = 15;
    strengths.push(`Good foundational skills list (${skillsCount} skills).`);
    skillsFeedback.push('Consider expanding skills towards 20-30 to maximize keyword match rates across diverse job descriptions.');
  } else {
    skillsScore = 20;
    strengths.push(`Robust skills inventory (${skillsCount} skills).`);
  }

  // 5. Education Audit (max 10 pts)
  let educationScore = 0;
  const educationFeedback: string[] = [];

  if (profile.education.length === 0) {
    weaknesses.push('No education history provided.');
    educationFeedback.push('Add degree, university/institution, and fields of study.');
  } else {
    educationScore += 7;
    const hasDegree = profile.education.some((e) => !!e.degree);
    if (hasDegree) {
      educationScore += 3;
      strengths.push('Education includes explicit degree and field of study.');
    } else {
      educationFeedback.push('Add your formal degree designation to education records.');
    }
  }

  // 6. Contact & Identity (max 10 pts)
  let contactScore = 0;
  if (profile.fullName) contactScore += 3;
  if (profile.contactInfo?.email) contactScore += 3;
  if (profile.contactInfo?.location) contactScore += 2;
  if (profile.contactInfo?.linkedinUrl) contactScore += 2;

  // ATS Readability Score calculation
  // ATS values standard headings, clear role titles, email, clean text formatting
  let atsReadabilityScore = 40;
  if (profile.fullName) atsReadabilityScore += 10;
  if (profile.headline) atsReadabilityScore += 15;
  if (profile.experiences.length > 0) atsReadabilityScore += 20;
  if (profile.skills.length >= 5) atsReadabilityScore += 10;
  if (profile.education.length > 0) atsReadabilityScore += 5;
  atsReadabilityScore = Math.min(100, Math.max(0, atsReadabilityScore));

  // Bullet Quality Score
  const bulletQualityScore = totalBullets > 0
    ? Math.round(((actionVerbBullets / totalBullets) * 50) + ((metricBullets / totalBullets) * 50))
    : 0;

  // Overall Completeness Score (0-100)
  // Weights: Headline (15) + Summary (15) + Experience (35) + Skills (20) + Education (10) + Contact (5 capped)
  const rawOverall = headlineScore + summaryScore + experienceScore + skillsScore + educationScore + (contactScore > 5 ? 5 : contactScore);
  const overallScore = Math.min(100, Math.max(0, rawOverall));

  const sectionScores: Record<string, SectionScore> = {
    headline: {
      name: 'Headline',
      score: headlineScore,
      maxScore: 15,
      status: headlineScore >= 12 ? 'excellent' : headlineScore >= 8 ? 'good' : 'needs_improvement',
      feedback: headlineFeedback,
    },
    summary: {
      name: 'Summary / About',
      score: summaryScore,
      maxScore: 15,
      status: summaryScore >= 12 ? 'excellent' : summaryScore >= 8 ? 'good' : 'needs_improvement',
      feedback: summaryFeedback,
    },
    experience: {
      name: 'Work Experience',
      score: experienceScore,
      maxScore: 35,
      status: experienceScore >= 28 ? 'excellent' : experienceScore >= 20 ? 'good' : 'needs_improvement',
      feedback: experienceFeedback,
    },
    skills: {
      name: 'Skills Inventory',
      score: skillsScore,
      maxScore: 20,
      status: skillsScore >= 18 ? 'excellent' : skillsScore >= 12 ? 'good' : 'needs_improvement',
      feedback: skillsFeedback,
    },
    education: {
      name: 'Education',
      score: educationScore,
      maxScore: 10,
      status: educationScore >= 8 ? 'excellent' : 'needs_improvement',
      feedback: educationFeedback,
    },
  };

  return {
    overallScore,
    atsReadabilityScore,
    bulletQualityScore,
    sectionScores,
    strengths,
    weaknesses,
    bulletAudits,
    criticalIssues,
    actionableRecommendations,
  };
}
