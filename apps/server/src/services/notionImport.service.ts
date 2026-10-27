import { MAX_IMPORT_UNPACKED_BYTES, type NotionImportResult } from '@notiz/shared';
import type { AppDatabase } from '../db/client.js';
import { ValidationError } from '../errors.js';
import { buildExportTree } from '../import/exportTree.js';
import { ZipError, type ZipEntries, readZipEntries } from '../import/zipEntries.js';
import type { AttachmentFiles } from '../storage/attachmentFiles.js';
import { NotionImporter } from './notionImporter.js';

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/** "Notion import 2026-10-27 17:05" in local time. */
export function importRootTitle(now: Date): string {
  const day = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  return `Notion import ${day} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

function unpack(zip: Uint8Array, maxUnpackedBytes: number): ZipEntries {
  try {
    return readZipEntries(zip, maxUnpackedBytes);
  } catch (error) {
    throw error instanceof ZipError ? new ValidationError(error.message) : error;
  }
}

/**
 * Imports a Notion "Markdown & CSV" export under one new top-level page. All
 * pages, databases, rows and attachments are created in one transaction; if
 * anything fails nothing is kept, including the files already written.
 * Existing pages are never changed.
 */
export function importNotionExport(
  db: AppDatabase,
  files: AttachmentFiles,
  zip: Uint8Array,
  now = new Date(),
  maxUnpackedBytes = MAX_IMPORT_UNPACKED_BYTES,
): NotionImportResult {
  const tree = buildExportTree(unpack(zip, maxUnpackedBytes));
  if (tree.roots.length === 0) {
    throw new ValidationError('No Notion pages found; export with "Markdown & CSV"');
  }
  const written: string[] = [];
  try {
    return db.transaction(() =>
      new NotionImporter(db, files, tree, (path) => written.push(path)).run(importRootTitle(now)),
    );
  } catch (error) {
    for (const path of written) files.removeSync(path);
    throw error;
  }
}
