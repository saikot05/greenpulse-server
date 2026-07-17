import { z } from 'zod';

/**
 * Zod Schema for validation of uploaded carbon dataset files.
 */
export const uploadDatasetSchema = z.object({
  fileName: z
    .string({ required_error: 'File name is required.' })
    .min(1, 'File name cannot be empty.')
    .trim(),
  fileType: z.enum(['CSV', 'JSON'], {
    errorMap: () => ({ message: "File type must be either 'CSV' or 'JSON'." }),
  }),
});
