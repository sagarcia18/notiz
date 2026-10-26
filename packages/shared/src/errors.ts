import { z } from 'zod';

export const errorCodeSchema = z.enum(['not_found', 'validation_failed', 'conflict', 'internal']);

export type ErrorCode = z.infer<typeof errorCodeSchema>;

export const errorResponseSchema = z.object({
  error: z.object({
    code: errorCodeSchema,
    message: z.string(),
  }),
});

export type ErrorResponse = z.infer<typeof errorResponseSchema>;
