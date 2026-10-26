import { randomUUID } from 'node:crypto';
import type { Readable } from 'node:stream';
import { type Attachment, MAX_ATTACHMENT_BYTES, attachmentUrl } from '@notiz/shared';
import type { AppDatabase } from '../db/client.js';
import { NotFoundError, ValidationError } from '../errors.js';
import * as repo from '../repositories/attachments.repository.js';
import type { AttachmentRow } from '../repositories/attachments.repository.js';
import type { AttachmentFiles } from '../storage/attachmentFiles.js';
import { requireActivePage } from './pages.service.js';

export interface UploadedFile {
  fileName: string;
  mime: string;
  stream: Readable & { truncated?: boolean };
}

function toAttachment(row: AttachmentRow): Attachment {
  return {
    id: row.id,
    pageId: row.pageId,
    fileName: row.fileName,
    mime: row.mime,
    size: row.size,
    url: attachmentUrl(row.id),
    createdAt: row.createdAt,
  };
}

function isFileTooLarge(error: unknown): boolean {
  return error instanceof Error && 'code' in error && error.code === 'FST_REQ_FILE_TOO_LARGE';
}

const tooLargeMessage = `File is larger than ${MAX_ATTACHMENT_BYTES / 1024 / 1024} MB`;

/** Writes the file to disk first, then records it; a failed upload leaves nothing behind. */
export async function uploadAttachment(
  db: AppDatabase,
  files: AttachmentFiles,
  pageId: string,
  upload: UploadedFile,
): Promise<Attachment> {
  requireActivePage(db, pageId);
  const id = randomUUID();
  const storedPath = files.storedPathFor(pageId, id, upload.fileName);
  try {
    const size = await files.write(storedPath, upload.stream);
    if (upload.stream.truncated === true) {
      throw new ValidationError(tooLargeMessage);
    }
    const row = repo.insertAttachment(db, {
      id,
      pageId,
      fileName: upload.fileName,
      storedPath,
      mime: upload.mime,
      size,
    });
    return toAttachment(row);
  } catch (error) {
    await files.remove(storedPath);
    throw isFileTooLarge(error) ? new ValidationError(tooLargeMessage) : error;
  }
}

export function getAttachment(db: AppDatabase, id: string): AttachmentRow {
  const row = repo.findAttachment(db, id);
  if (!row) {
    throw new NotFoundError('Attachment', id);
  }
  return row;
}
