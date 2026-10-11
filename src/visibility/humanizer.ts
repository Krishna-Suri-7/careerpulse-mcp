export interface ClicheDetection {
  cliche: string;
  count: number;
  replacementSuggestion: string;
}

export interface HumanizeResult {
  humanizedText: string;
  originalText: string;
  detectedCliches: ClicheDetection[];
  clicheScore: number; // 0 to 100 (0 = authentic engineer, 100 = heavy AI cliche)
  improvementsApplied: string[];
}

/**
 * Curated list of recognizable LLM / AI clichés and their authentic engineering replacements
 */
export const BANNED_LLM_CLICHES: {
  pattern: RegExp;
  label: string;
  replacement: string;
  description: string;
}[] = [
  {
    pattern: /\b(?:i am |i'm )?(?:thrilled|excited|humbled and honored|pleased|proud) to (?:announce|share)\b/gi,
    label: 'thrilled to announce/share',
    replacement: 'We launched',
    description: 'Corporate humblebrag intro stripped in favor of direct engineering fact',
  },
  {
    pattern: /\b(?:delve into|delving into|delves into|delve)\b/gi,
    label: 'delve',
    replacement: 'investigate',
    description: 'Academic AI hallmark replaced with active engineering verb',
  },
  {
    pattern: /\b(?:a testament to|is a testament to|stands as a testament to|testament)\b/gi,
    label: 'testament',
    replacement: 'demonstrates',
    description: 'Pompous filler replaced with concrete demonstration',
  },
  {
    pattern: /\b(?:supercharge|supercharging|supercharged)\b/gi,
    label: 'supercharge',
    replacement: 'accelerate',
    description: 'Marketing buzzword replaced with technical velocity metric',
  },
  {
    pattern: /\b(?:game-changer|game changing|game-changing)\b/gi,
    label: 'game-changer',
    replacement: 'significant improvement',
    description: 'Hyperbolic hype replaced with measured assessment',
  },
  {
    pattern: /\b(?:in today's (?:fast-paced|rapidly evolving) (?:world|landscape)|in the fast-paced world of)\b/gi,
    label: 'in today\'s fast-paced world',
    replacement: 'In production systems',
    description: 'Generic AI preamble cut down to concrete production context',
  },
  {
    pattern: /\b(?:navigating the (?:complex )?landscape of|navigating the landscape)\b/gi,
    label: 'navigating the landscape',
    replacement: 'architecting',
    description: 'Vague geographical metaphor replaced with technical execution',
  },
  {
    pattern: /\b(?:a beacon of|beacon)\b/gi,
    label: 'beacon',
    replacement: 'a benchmark for',
    description: 'Overwrought metaphor replaced with technical benchmark',
  },
  {
    pattern: /\b(?:rich tapestry of|tapestry)\b/gi,
    label: 'tapestry',
    replacement: 'ecosystem',
    description: 'Classic LLM metaphor stripped',
  },
  {
    pattern: /\b(?:spearheading a paradigm shift|paradigm shift)\b/gi,
    label: 'paradigm shift',
    replacement: 'architectural migration',
    description: 'Vague buzzword replaced with exact engineering initiative',
  },
  {
    pattern: /\b(?:unlock the power of|unlocking the power of|unlocking the potential)\b/gi,
    label: 'unlock the power of',
    replacement: 'adopt',
    description: 'Advertiser cliché replaced with direct adoption verb',
  },
  {
    pattern: /\b(?:foster a culture of|fostering a culture of)\b/gi,
    label: 'foster a culture of',
    replacement: 'establish',
    description: 'Soft HR-filler grounded into team engineering standards',
  },
  {
    pattern: /\b(?:transformative journey|embarked on a journey)\b/gi,
    label: 'transformative journey',
    replacement: 'migration',
    description: 'Heroic fantasy phrasing replaced with engineering project',
  },
  {
    pattern: /\bseamlessly\b/gi,
    label: 'seamlessly',
    replacement: 'reliably',
    description: 'Overpromised adverb replaced with measurable reliability',
  },
  {
    pattern: /\b(?:cutting-edge|state-of-the-art)\b/gi,
    label: 'cutting-edge',
    replacement: 'modern',
    description: 'Unsubstantiated hyperbole replaced with grounded descriptor',
  },
];

/**
 * Pure function: Detects clichés and returns occurrences
 */
export function auditCliches(text: string): ClicheDetection[] {
  const detections: ClicheDetection[] = [];

  for (const item of BANNED_LLM_CLICHES) {
    const matches = text.match(item.pattern);
    if (matches && matches.length > 0) {
      detections.push({
        cliche: item.label,
        count: matches.length,
        replacementSuggestion: item.replacement,
      });
    }
  }

  return detections;
}

/**
 * Pure function: Strips out AI clichés and formats text into authentic, direct engineering voice
 */
export function humanizeEngineeringText(text: string): HumanizeResult {
  const detectedCliches = auditCliches(text);
  let processed = text;
  const improvementsApplied: string[] = [];

  for (const item of BANNED_LLM_CLICHES) {
    if (item.pattern.test(processed)) {
      processed = processed.replace(item.pattern, item.replacement);
      improvementsApplied.push(`Replaced "${item.label}" with "${item.replacement}" (${item.description})`);
    }
  }

  // Clean double spaces or trailing punctuation weirdness created by replacement
  processed = processed
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  // Compute cliche score: 0 to 100
  // Each cliche adds 25 points, capped at 100
  const totalClichesCount = detectedCliches.reduce((acc, d) => acc + d.count, 0);
  const rawScore = totalClichesCount * 25;
  const clicheScore = Math.min(100, Math.max(0, rawScore));

  return {
    humanizedText: processed,
    originalText: text,
    detectedCliches,
    clicheScore,
    improvementsApplied,
  };
}
