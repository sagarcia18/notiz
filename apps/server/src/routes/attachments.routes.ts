import multipart from '@fastify/multipart';
import { MAX_ATTACHMENT_BYTES, pageIdSchema } from '@notiz/shared';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { AppDatabase } from '../db/client.js';
import { ValidationError } from '../errors.js';
import { getAttachment, uploadAttachment } from '../services/attachments.service.js';
import type { AttachmentFiles } from '../storage/attachmentFiles.js';

const pageParamsSchema = z.object({ id: pageIdSchema });
const attachmentParamsSchema = z.object({ id: z.uuid() });

/** Types a browser may render inline; everything else is offered as a download. */
const INLINE_MIME = /^(image\/(png|jpeg|gif|webp|avif|bmp)|video\/|audio\/|application\/pdf$)/;

function contentDisposition(mime: string, fileName: string): string {
  const kind = INLINE_MIME.test(mime) ? 'inline' : 'attachment';
  return `${kind}; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}

export function registerAttachmentRoutes(
  app: FastifyInstance,
  db: AppDatabase,
  files: AttachmentFiles,
): void {
  void app.register(multipart, { limits: { fileSize: MAX_ATTACHMENT_BYTES, files: 1 } });

  app.post('/api/pages/:id/attachments', async (request, reply) => {
    const { id } = pageParamsSchema.parse(request.params);
    const part = await request.file();
    if (!part) {
      throw new ValidationError('Expected one file in the multipart body');
    }
    const attachment = await uploadAttachment(db, files, id, {
      fileName: part.filename,
      mime: part.mimetype || 'application/octet-stream',
      stream: part.file,
    });
    return reply.status(201).send(attachment);
  });

  app.get('/api/attachments/:id', (request, reply) => {
    const row = getAttachment(db, attachmentParamsSchema.parse(request.params).id);
    return reply
      .header('content-type', row.mime)
      .header('content-length', row.size)
      .header('content-disposition', contentDisposition(row.mime, row.fileName))
      .header('x-content-type-options', 'nosniff')
      .header('content-security-policy', "default-src 'none'; sandbox")
      .header('cache-control', 'private, max-age=31536000, immutable')
      .send(files.openRead(row.storedPath));
  });
}
