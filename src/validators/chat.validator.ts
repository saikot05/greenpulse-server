import { z } from 'zod';

/**
 * Zod Schema for validation of chat messages sent to the AI assistant.
 */
export const sendMessageSchema = z.object({
  sessionId: z
    .string({ required_error: 'Session ID is required.' })
    .min(1, 'Session ID cannot be empty.')
    .trim(),
  message: z
    .string({ required_error: 'Message content is required.' })
    .min(1, 'Message content cannot be empty.')
    .trim(),
});
