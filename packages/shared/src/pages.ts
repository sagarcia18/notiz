import { z } from 'zod';

export const pageKindSchema = z.enum(['doc', 'database', 'dashboard']);

export type PageKind = z.infer<typeof pageKindSchema>;
