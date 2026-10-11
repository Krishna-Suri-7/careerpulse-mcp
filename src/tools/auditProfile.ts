import { AuditProfileInputSchema } from '../schemas/tools.js';
import { auditLinkedInProfile } from '../utils/atsRules.js';

export const auditProfileTool = {
  name: 'audit_profile',
  description:
    'Analyzes the loaded profile across ATS readability, bullet point structure (action verb + metrics), and completeness score (0-100).',
  schema: AuditProfileInputSchema,
  execute: async (input: unknown) => {
    try {
      const validatedInput = AuditProfileInputSchema.parse(input);
      const auditResult = auditLinkedInProfile(validatedInput.profile);

      // Format markdown summary
      const mdReport = [
        `# LinkedIn Profile Audit Report`,
        `**Overall Completeness Score:** ${auditResult.overallScore}/100`,
        `**ATS Readability Score:** ${auditResult.atsReadabilityScore}/100`,
        `**Bullet Point Quality Score:** ${auditResult.bulletQualityScore}/100\n`,
        `### Section Breakdown`,
        ...Object.values(auditResult.sectionScores).map(
          (sec) => `- **${sec.name}:** ${sec.score}/${sec.maxScore} (${sec.status.toUpperCase()})`
        ),
        '',
        `### Strengths`,
        ...auditResult.strengths.map((s) => `✅ ${s}`),
        '',
        `### Weaknesses & Areas for Improvement`,
        ...auditResult.weaknesses.map((w) => `⚠️ ${w}`),
        '',
        auditResult.criticalIssues.length > 0 ? `### Critical Issues\n${auditResult.criticalIssues.map((c) => `❌ ${c}`).join('\n')}\n` : '',
        `### Actionable Recommendations`,
        ...auditResult.actionableRecommendations.map((r, i) => `${i + 1}. ${r}`),
      ].filter(Boolean).join('\n');

      const responsePayload = {
        summary: mdReport,
        audit: auditResult,
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
            text: `Error auditing LinkedIn profile: ${error.message || String(error)}`,
          },
        ],
        isError: true,
      };
    }
  },
};
