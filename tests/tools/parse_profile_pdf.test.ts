import { describe, it, expect } from 'vitest';
import { parseProfilePdfTool } from '../../src/tools/parseProfilePdf.js';
import { createSyntheticPdfBuffer } from '../testUtils.js';

describe('Tool: parse_profile_pdf', () => {
  it('parses a valid base64 PDF and returns structured profile response', async () => {
    const pdfLines = [
      'Alice Walker',
      'Staff Engineer | Cloud Infrastructure',
      'San Francisco Bay Area',
      'Summary',
      'Building high throughput systems.',
      'Experience',
      'Acme Inc',
      'Senior Cloud Architect',
      'Jan 2021 - Present',
      '• Engineered serverless data processing platform.',
      'Skills',
      'Go',
      'Kubernetes',
      'AWS',
    ];

    const buf = createSyntheticPdfBuffer(pdfLines);
    const base64 = buf.toString('base64');

    const result = await parseProfilePdfTool.execute({ base64 });

    expect(result.isError).toBe(false);
    expect(result.content).toHaveLength(1);

    const parsedData = JSON.parse(result.content[0].text);
    expect(parsedData.success).toBe(true);
    expect(parsedData.profile.fullName).toBe('Alice Walker');
    expect(parsedData.profile.headline).toContain('Staff Engineer');
    expect(parsedData.profile.skills).toContain('Go');
    expect(parsedData.stats.experienceCount).toBeGreaterThanOrEqual(1);
  });

  it('returns isError: true on invalid non-existent file path', async () => {
    const result = await parseProfilePdfTool.execute({
      filePath: './non_existent_folder/missing_file.pdf',
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Error parsing LinkedIn profile PDF');
    expect(result.content[0].text).toContain('PDF file not found');
  });

  it('returns isError: true when neither filePath nor base64 is provided', async () => {
    const result = await parseProfilePdfTool.execute({});

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Either filePath or base64 must be provided');
  });
});
