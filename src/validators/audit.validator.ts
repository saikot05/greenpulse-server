import { z } from 'zod';

const facilityTypeLiterals = [
  z.literal('Manufacturing'),
  z.literal('Data Center'),
  z.literal('Corporate Office'),
  z.literal('Logistics Hub'),
  z.literal('Retail Store'),
] as const;

const scopeCategoryLiterals = [
  z.literal('Scope 1 (Direct)'),
  z.literal('Scope 2 (Indirect Energy)'),
  z.literal('Scope 3 (Value Chain)'),
] as const;

const riskRatingLiterals = [
  z.literal('Low Carbon'),
  z.literal('Moderate Impact'),
  z.literal('High Emissions'),
  z.literal('Critical Failure'),
] as const;

/**
 * Zod Schema for EsgAudit creation validation.
 */
export const createAuditSchema = z.object({
  title: z
    .string({ message: 'Audit title is required.' })
    .min(3, 'Audit title must be at least 3 characters long.')
    .trim(),
  facilityName: z
    .string({ message: 'Facility name is required.' })
    .min(2, 'Facility name must be at least 2 characters long.')
    .trim(),
  facilityType: z.union(facilityTypeLiterals, {
    message: 'Facility type must be one of: Manufacturing, Data Center, Corporate Office, Logistics Hub, Retail Store.',
  }),
  location: z
    .string({ message: 'Location is required.' })
    .min(2, 'Location details must be at least 2 characters long.')
    .trim(),
  auditYear: z
    .number({ message: 'Audit year is required.' })
    .int('Audit year must be an integer.')
    .min(1900, 'Audit year must be 1900 or later.')
    .max(2100, 'Audit year cannot exceed 2100.'),
  scopeCategory: z.union(scopeCategoryLiterals, {
    message: 'Scope category must be one of: Scope 1 (Direct), Scope 2 (Indirect Energy), Scope 3 (Value Chain).',
  }),
  carbonScoreTons: z
    .number({ message: 'Carbon score (tons) is required.' })
    .min(0, 'Carbon score cannot be negative.'),
  energyUsageKwh: z
    .number({ message: 'Energy usage (Kwh) is required.' })
    .min(0, 'Energy usage cannot be negative.'),
  riskRating: z.union(riskRatingLiterals, {
    message: 'Risk rating must be one of: Low Carbon, Moderate Impact, High Emissions, Critical Failure.',
  }),
  shortDescription: z
    .string({ message: 'Short description is required.' })
    .min(10, 'Short description must be at least 10 characters long.')
    .trim(),
  fullOverview: z
    .string({ message: 'Full overview is required.' })
    .min(20, 'Full overview must be at least 20 characters long.')
    .trim(),
  imageUrl: z
    .string()
    .url('Image URL must be a valid absolute HTTP address.')
    .optional()
    .or(z.literal('')),
  tags: z
    .array(
      z.string().min(1, 'Individual tag cannot be empty.').trim()
    )
    .optional(),
});

/**
 * Zod Schema for EsgAudit partial update validation.
 */
export const updateAuditSchema = createAuditSchema.partial();

/**
 * Zod Schema for EsgAudit query parameters validation.
 * Utilizes z.coerce to ensure query parameter string inputs transpile properly into numbers.
 */
export const queryAuditSchema = z.object({
  page: z.coerce.number().int().positive('Page number must be positive.').default(1),
  limit: z.coerce.number().int().positive('Limit must be positive.').default(10),
  search: z.string().optional(),
  facilityType: z.union(facilityTypeLiterals).optional(),
  riskRating: z.union(riskRatingLiterals).optional(),
  auditYear: z.coerce.number().int().min(1900).max(2100).optional(),
  scopeCategory: z.union(scopeCategoryLiterals).optional(),
  sortBy: z.string().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});
