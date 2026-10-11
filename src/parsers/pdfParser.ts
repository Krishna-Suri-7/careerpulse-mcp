import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import pdfParse from 'pdf-parse';
import { LinkedInProfile, LinkedInProfileSchema } from '../schemas/profile.js';
import { parseLinkedInText } from './textParser.js';

export interface ParsePdfOptions {
  filePath?: string;
  base64?: string;
}

export interface ParseResult {
  profile: LinkedInProfile;
  rawText: string;
  numPages: number;
}

/**
 * Ingests a LinkedIn profile PDF from either a local file path or base64 string
 * and parses it into a strongly typed LinkedInProfile.
 */
export async function parseLinkedInPdf(options: ParsePdfOptions): Promise<ParseResult> {
  let buffer: Buffer;

  if (options.filePath) {
    const resolvedPath = path.resolve(options.filePath);
    if (!existsSync(resolvedPath)) {
      throw new Error(`PDF file not found at path: ${options.filePath}`);
    }
    buffer = await fs.readFile(resolvedPath);
  } else if (options.base64) {
    // Strip possible data URI scheme prefix like data:application/pdf;base64,
    const cleanBase64 = options.base64.replace(/^data:application\/pdf;base64,/, '');
    buffer = Buffer.from(cleanBase64, 'base64');
  } else {
    throw new Error('Either filePath or base64 must be provided to parseLinkedInPdf');
  }

  if (!buffer || buffer.length === 0) {
    throw new Error('PDF buffer is empty');
  }

  // Parse text using pdf-parse with safe Uint8Array typed view
  const uint8Array = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  const pdfData = await pdfParse(uint8Array as unknown as Buffer);
  const rawText = pdfData.text || '';
  const numPages = pdfData.numpages || 1;

  if (rawText.trim().length === 0) {
    throw new Error('PDF contains no extractable text content');
  }

  // Parse structured profile from extracted text
  const profile = parseLinkedInText(rawText);

  return {
    profile,
    rawText,
    numPages,
  };
}

/**
 * Parses a profile from JSON string or object
 */
export function parseLinkedInJson(content: string | object): LinkedInProfile {
  let obj: any;
  if (typeof content === 'string') {
    try {
      obj = JSON.parse(content);
    } catch (err: any) {
      throw new Error(`Failed to parse JSON profile content: ${err.message}`);
    }
  } else {
    obj = content;
  }

  return LinkedInProfileSchema.parse(obj);
}
