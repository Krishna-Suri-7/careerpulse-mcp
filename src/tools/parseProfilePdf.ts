import { ParseProfilePdfInputSchema } from '../schemas/tools.js';
import { parseLinkedInPdf } from '../parsers/pdfParser.js';

export const parseProfilePdfTool = {
  name: 'parse_profile_pdf',
  description:
    'Accepts a local file path or base64 string of a LinkedIn profile PDF, parses text, and returns structured profile JSON.',
  schema: ParseProfilePdfInputSchema,
  execute: async (input: unknown) => {
    try {
      const validatedInput = ParseProfilePdfInputSchema.parse(input);
      const result = await parseLinkedInPdf(validatedInput);

      const responsePayload = {
        success: true,
        summary: `Successfully parsed LinkedIn profile for "${result.profile.fullName || 'Unknown'}" across ${result.numPages} page(s).`,
        profile: result.profile,
        stats: {
          numPages: result.numPages,
          experienceCount: result.profile.experiences.length,
          skillsCount: result.profile.skills.length,
          educationCount: result.profile.education.length,
          certificationsCount: (result.profile.certifications || []).length,
        },
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
            text: `Error parsing LinkedIn profile PDF: ${error.message || String(error)}`,
          },
        ],
        isError: true,
      };
    }
  },
};
