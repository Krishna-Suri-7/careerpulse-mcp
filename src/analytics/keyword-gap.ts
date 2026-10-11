import {
  tokenizeWords,
  extractNGrams,
  extractTargetKeywords,
  searchKeywordInProfile,
  analyzeKeywordGapEngine,
  HARD_SKILLS_DICTIONARY,
  SOFT_SKILLS_DICTIONARY,
  KeywordAnalysisReport,
  KeywordEntry,
} from './keyword-analyzer.js';
import { CompleteProfile } from '../contracts/profile-schema.js';

export {
  tokenizeWords,
  extractNGrams,
  extractTargetKeywords,
  searchKeywordInProfile,
  analyzeKeywordGapEngine,
  HARD_SKILLS_DICTIONARY,
  SOFT_SKILLS_DICTIONARY,
  KeywordAnalysisReport,
  KeywordEntry,
};

export interface SkillGapItem {
  skill: string;
  category: 'hard' | 'soft';
  presentInProfile: boolean;
  frequency: number;
  locations: string[];
  suggestedAction: string;
}

export interface SkillGapAnalysisResult {
  matchPercentage: number;
  totalJobSkills: number;
  matchedSkillsCount: number;
  missingSkillsCount: number;
  matchedHardSkills: string[];
  missingHardSkills: string[];
  matchedSoftSkills: string[];
  missingSoftSkills: string[];
  gapDetails: SkillGapItem[];
  recruiterSearchRecommendations: {
    skillsSection: string[];
    headline: string[];
    experienceBullets: string[];
    summary: string[];
  };
}

/**
 * Pure function: Tokenizes target job description, filters stop words, and computes hard/soft skill gaps
 */
export function calculateKeywordGap(
  profile: CompleteProfile,
  targetJobDescription: string,
  options?: {
    targetRoleTitle?: string;
    targetRoleKeywords?: string[];
    maxNGram?: number;
  }
): SkillGapAnalysisResult {
  const analysis = analyzeKeywordGapEngine(profile, {
    targetJobDescription,
    targetRoleTitle: options?.targetRoleTitle,
    targetRoleKeywords: options?.targetRoleKeywords,
    maxNGram: options?.maxNGram || 3,
  });

  const gapDetails: SkillGapItem[] = analysis.details.map((entry) => ({
    skill: entry.keyword,
    category: entry.category,
    presentInProfile: entry.found,
    frequency: entry.frequency,
    locations: entry.locations,
    suggestedAction: entry.placementRecommendation || 'Ensure prominent keyword density across roles.',
  }));

  return {
    matchPercentage: analysis.matchScore,
    totalJobSkills: analysis.totalIdentified,
    matchedSkillsCount: analysis.matchedCount,
    missingSkillsCount: analysis.missingCount,
    matchedHardSkills: analysis.hardSkills.matched,
    missingHardSkills: analysis.hardSkills.missing,
    matchedSoftSkills: analysis.softSkills.matched,
    missingSoftSkills: analysis.softSkills.missing,
    gapDetails,
    recruiterSearchRecommendations: {
      skillsSection: analysis.strategicPlacements.skills,
      headline: analysis.strategicPlacements.headline,
      experienceBullets: analysis.strategicPlacements.experience,
      summary: analysis.strategicPlacements.summary,
    },
  };
}
