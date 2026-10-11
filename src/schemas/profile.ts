import { z } from 'zod';

export const ContactInfoSchema = z.object({
  fullName: z.string().optional(),
  email: z.string().email().or(z.string()).optional(),
  phone: z.string().optional(),
  location: z.string().optional(),
  linkedinUrl: z.string().url().or(z.string()).optional(),
  portfolioUrl: z.string().url().or(z.string()).optional(),
  websites: z.array(z.string()).optional(),
});

export type ContactInfo = z.infer<typeof ContactInfoSchema>;

export const ExperienceSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, 'Job title is required'),
  company: z.string().min(1, 'Company name is required'),
  location: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  isCurrent: z.boolean().optional().default(false),
  description: z.string().optional().default(''),
  bulletPoints: z.array(z.string()).optional().default([]),
});

export type Experience = z.infer<typeof ExperienceSchema>;

export const EducationSchema = z.object({
  id: z.string().optional(),
  school: z.string().min(1, 'School/Institution is required'),
  degree: z.string().optional(),
  fieldOfStudy: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  grade: z.string().optional(),
  activities: z.string().optional(),
});

export type Education = z.infer<typeof EducationSchema>;

export const CertificationSchema = z.object({
  name: z.string().min(1, 'Certification name is required'),
  issuer: z.string().optional(),
  issueDate: z.string().optional(),
  expirationDate: z.string().optional(),
  credentialId: z.string().optional(),
  credentialUrl: z.string().url().or(z.string()).optional(),
});

export type Certification = z.infer<typeof CertificationSchema>;

export const LinkedInProfileSchema = z.object({
  fullName: z.string().optional().default(''),
  headline: z.string().default(''),
  summary: z.string().optional().default(''),
  experiences: z.array(ExperienceSchema).default([]),
  skills: z.array(z.string()).default([]),
  education: z.array(EducationSchema).default([]),
  certifications: z.array(CertificationSchema).optional().default([]),
  contactInfo: ContactInfoSchema.optional().default({}),
});

export type LinkedInProfile = z.infer<typeof LinkedInProfileSchema>;

export const PartialLinkedInProfileSchema = LinkedInProfileSchema.partial();
export type PartialLinkedInProfile = z.infer<typeof PartialLinkedInProfileSchema>;
