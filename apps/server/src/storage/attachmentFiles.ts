import fs from 'node:fs';
import path from 'node:path';
import type { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

const ATTACHMENTS_FOLDER = 'attachments';
const MAX_NAME_LENGTH = 100;

/** Makes a client file name safe for Windows and POSIX file systems. */
export function safeFileName(fileName: string): string {
  const base = fileName.split(/[\\/]/).pop() ?? '';
  const cleaned = base
    .replace(/[<>:"|?*]/g, '_')
    .replace(/\p{Cc}/gu, '')
    .replace(/[. ]+$/, '')
    .trim();
  const limited = cleaned.slice(-MAX_NAME_LENGTH);
  return limited === '' || limited.startsWith('.') ? `file${limited}` : limited;
}

/**
 * Attachment files on disk. Paths stored in the database are relative to the
 * data folder (`attachments/<pageId>/<attachmentId>-<fileName>`).
 */
export class AttachmentFiles {
  constructor(private readonly dataDir: string) {}

  absolutePath(storedPath: string): string {
    return path.join(this.dataDir, storedPath);
  }

  storedPathFor(pageId: string, attachmentId: string, fileName: string): string {
    return path.posix.join(ATTACHMENTS_FOLDER, pageId, `${attachmentId}-${safeFileName(fileName)}`);
  }

  /** Streams the upload to disk and returns its byte size. */
  async write(storedPath: string, source: Readable): Promise<number> {
    const target = this.absolutePath(storedPath);
    await fs.promises.mkdir(path.dirname(target), { recursive: true });
    await pipeline(source, fs.createWriteStream(target));
    const { size } = await fs.promises.stat(target);
    return size;
  }

  async remove(storedPath: string): Promise<void> {
    await fs.promises.rm(this.absolutePath(storedPath), { force: true });
  }

  /** Writes bytes already in memory; synchronous so it can run inside a SQLite transaction. */
  writeBytesSync(storedPath: string, bytes: Uint8Array): number {
    const target = this.absolutePath(storedPath);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, bytes);
    return bytes.byteLength;
  }

  removeSync(storedPath: string): void {
    fs.rmSync(this.absolutePath(storedPath), { force: true });
  }

  /** Deletes the attachment folders of permanently deleted pages. */
  async removePageFolders(pageIds: string[]): Promise<void> {
    await Promise.all(
      pageIds.map((pageId) =>
        fs.promises.rm(path.join(this.dataDir, ATTACHMENTS_FOLDER, pageId), {
          recursive: true,
          force: true,
        }),
      ),
    );
  }

  openRead(storedPath: string): fs.ReadStream {
    return fs.createReadStream(this.absolutePath(storedPath));
  }
}
