import { z } from 'zod';
import { pageIdSchema } from './pages.js';

/** Largest Notion export zip accepted by `POST /api/import/notion`. */
export const MAX_IMPORT_BYTES = 500 * 1024 * 1024;

/** Largest total size of the files inside the export (nested zips included). */
export const MAX_IMPORT_UNPACKED_BYTES = 1024 * 1024 * 1024;

export const notionImportResultSchema = z.object({
  rootPageId: pageIdSchema,
  pages: z.number().int(),
  databases: z.number().int(),
  rows: z.number().int(),
  attachments: z.number().int(),
  warnings: z.array(z.string()),
});

export type NotionImportResult = z.infer<typeof notionImportResultSchema>;
