import { unzipSync } from 'fflate';

/** Files of an archive by normalized path (forward slashes, no leading `./` or `/`). */
export type ZipEntries = Map<string, Uint8Array>;

export class ZipError extends Error {}

const MAX_NESTING = 3;

export function normalizeZipPath(name: string): string {
  return name.replace(/\\/g, '/').replace(/^(\.\/|\/)+/, '');
}

function isNestedZip(path: string): boolean {
  return path.toLowerCase().endsWith('.zip');
}

/**
 * Unpacks a zip into memory. Zips inside it (Notion splits large exports into
 * `Part-N.zip` files) are unpacked into the same namespace. `maxBytes` caps the
 * total unpacked size, so a crafted archive cannot exhaust memory.
 */
export function readZipEntries(data: Uint8Array, maxBytes: number): ZipEntries {
  const entries: ZipEntries = new Map();
  let total = 0;
  const visit = (archive: Uint8Array, depth: number): void => {
    let files: Record<string, Uint8Array>;
    try {
      files = unzipSync(archive, {
        filter: (file) => {
          total += file.originalSize;
          if (total > maxBytes) {
            throw new ZipError(`The export unpacks to more than ${maxBytes / 1024 / 1024} MB`);
          }
          return !file.name.endsWith('/');
        },
      });
    } catch (error) {
      if (error instanceof ZipError) throw error;
      throw new ZipError('The file is not a valid zip archive');
    }
    for (const [name, bytes] of Object.entries(files)) {
      const path = normalizeZipPath(name);
      if (isNestedZip(path) && depth < MAX_NESTING) {
        visit(bytes, depth + 1);
      } else if (path !== '' && !path.startsWith('__MACOSX/')) {
        entries.set(path, bytes);
      }
    }
  };
  visit(data, 0);
  return entries;
}
