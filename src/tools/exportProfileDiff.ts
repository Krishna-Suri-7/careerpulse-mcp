import { ExportProfileDiffInputSchema } from '../schemas/tools.js';
import { generateProfileDiff } from '../utils/diff.js';

export const exportProfileDiffTool = {
  name: 'export_profile_diff',
  description:
    'Generates a Markdown diff between the current profile and proposed updates.',
  schema: ExportProfileDiffInputSchema,
  execute: async (input: unknown) => {
    try {
      const validatedInput = ExportProfileDiffInputSchema.parse(input);
      const diffResult = generateProfileDiff(
        validatedInput.currentProfile,
        validatedInput.updatedProfile
      );

      const responsePayload = {
        hasChanges: diffResult.hasChanges,
        totalChanges: diffResult.totalChanges,
        stats: {
          additions: diffResult.additionsCount,
          modifications: diffResult.modificationsCount,
          deletions: diffResult.deletionsCount,
        },
        markdownDiff: diffResult.markdown,
        detailedEntries: diffResult.entries,
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
            text: `Error exporting profile diff: ${error.message || String(error)}`,
          },
        ],
        isError: true,
      };
    }
  },
};
