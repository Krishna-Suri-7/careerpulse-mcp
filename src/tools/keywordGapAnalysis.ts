import { KeywordGapAnalysisInputSchema } from '../schemas/tools.js';
import { analyzeKeywordGap } from '../utils/keywords.js';

export const keywordGapAnalysisTool = {
  name: 'keyword_gap_analysis',
  description:
    'Compares a profile against target job descriptions or target role keywords; identifies missing hard/soft skills and recommends placement.',
  schema: KeywordGapAnalysisInputSchema,
  execute: async (input: unknown) => {
    try {
      const validatedInput = KeywordGapAnalysisInputSchema.parse(input);
      const gapResult = analyzeKeywordGap(validatedInput.profile, {
        targetJobDescription: validatedInput.targetJobDescription,
        targetRoleKeywords: validatedInput.targetRoleKeywords,
        targetRoleTitle: validatedInput.targetRoleTitle,
      });

      const mdReport = [
        `# Keyword Gap Analysis Report`,
        `**Keyword Match Score:** ${gapResult.matchScore}%`,
        `**Matched Keywords:** ${gapResult.matchedCount}/${gapResult.totalIdentifiedKeywords}`,
        `**Missing Keywords:** ${gapResult.missingCount}\n`,
        `### Technical & Hard Skills Gap`,
        `- **Matched (${gapResult.matchedHardSkills.length}):** ${gapResult.matchedHardSkills.join(', ') || 'None'}`,
        `- **Missing (${gapResult.missingHardSkills.length}):** ${gapResult.missingHardSkills.join(', ') || 'None'}\n`,
        `### Soft Skills & Competencies Gap`,
        `- **Matched (${gapResult.matchedSoftSkills.length}):** ${gapResult.matchedSoftSkills.join(', ') || 'None'}`,
        `- **Missing (${gapResult.missingSoftSkills.length}):** ${gapResult.missingSoftSkills.join(', ') || 'None'}\n`,
        `### Strategic Placement Recommendations`,
        gapResult.strategicPlacementAdvice.headline.length > 0
          ? `**Headline:**\n${gapResult.strategicPlacementAdvice.headline.map((h) => `- ${h}`).join('\n')}`
          : '',
        gapResult.strategicPlacementAdvice.skills.length > 0
          ? `**Skills Section:**\n${gapResult.strategicPlacementAdvice.skills.map((s) => `- ${s}`).join('\n')}`
          : '',
        gapResult.strategicPlacementAdvice.experience.length > 0
          ? `**Experience Bullets:**\n${gapResult.strategicPlacementAdvice.experience.map((e) => `- ${e}`).join('\n')}`
          : '',
        gapResult.strategicPlacementAdvice.summary.length > 0
          ? `**Summary / About:**\n${gapResult.strategicPlacementAdvice.summary.map((su) => `- ${su}`).join('\n')}`
          : '',
      ].filter(Boolean).join('\n');

      const responsePayload = {
        summary: mdReport,
        analysis: gapResult,
      };

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(responsePayload, null, 2),
          },
        ],
        isError: false,
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: 'text' as const,
            text: `Error conducting keyword gap analysis: ${error.message || String(error)}`,
          },
        ],
        isError: true,
      };
    }
  },
};
