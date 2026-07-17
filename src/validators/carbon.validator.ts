import { z } from 'zod';

/**
 * Zod Schema for validation of uploaded carbon dataset files.
 */
export const uploadDatasetSchema = z.object({
  fileName: z
    .string({ message: 'File name is required.' })
    .min(1, 'File name cannot be empty.')
    .trim(),
  fileType: z.union([z.literal('CSV'), z.literal('JSON')], {
    message: "File type must be either 'CSV' or 'JSON'.",
  }),
});
