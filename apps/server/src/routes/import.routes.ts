import { MAX_IMPORT_BYTES } from '@notiz/shared';
import type { FastifyInstance } from 'fastify';
import type { AppDatabase } from '../db/client.js';
import { ValidationError } from '../errors.js';
import { importNotionExport } from '../services/notionImport.service.js';
import type { AttachmentFiles } from '../storage/attachmentFiles.js';

function isFileTooLarge(error: unknown): boolean {
  return error instanceof Error && 'code' in error && error.code === 'FST_REQ_FILE_TOO_LARGE';
}

/** Needs the multipart plugin, which the attachment routes register. */
export function registerImportRoutes(
  app: FastifyInstance,
  db: AppDatabase,
  files: AttachmentFiles,
): void {
  app.post('/api/import/notion', async (request, reply) => {
    const part = await request.file({ limits: { fileSize: MAX_IMPORT_BYTES, files: 1 } });
    if (!part) {
      throw new ValidationError('Expected the Notion export zip in the multipart body');
    }
    let zip: Buffer;
    try {
      zip = await part.toBuffer();
    } catch (error) {
      if (!isFileTooLarge(error)) throw error;
      throw new ValidationError(`The export is larger than ${MAX_IMPORT_BYTES / 1024 / 1024} MB`);
    }
    return reply.status(201).send(importNotionExport(db, files, new Uint8Array(zip)));
  });
}
