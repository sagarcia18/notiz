import { z } from 'zod';
import { pageIdSchema } from './pages.js';

export const attachmentSchema = z.object({
  id: z.uuid(),
  pageId: pageIdSchema,
  fileName: z.string(),
  mime: z.string(),
  size: z.number().int().nonnegative(),
  /** Path the web app can load the file from. */
  url: z.string(),
  createdAt: z.string(),
});

export type Attachment = z.infer<typeof attachmentSchema>;

/** Largest accepted upload in bytes. */
export const MAX_ATTACHMENT_BYTES = 50 * 1024 * 1024;

export function attachmentUrl(id: string): string {
  return `/api/attachments/${id}`;
}
