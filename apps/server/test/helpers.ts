import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { type AppDatabase, openDatabase } from '../src/db/client.js';
import { runMigrations } from '../src/db/migrate.js';

/** Data folder for tests that never write files. */
export const unusedDataDir = path.join(os.tmpdir(), 'notiz-unused');

export function createTestDatabase(): AppDatabase {
  const db = openDatabase(':memory:');
  runMigrations(db);
  return db;
}

export function createTempDataDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'notiz-test-'));
}

export interface MultipartBody {
  payload: Buffer;
  headers: { 'content-type': string };
}

/** Builds a single-file multipart/form-data body for app.inject. */
export function multipartFile(fileName: string, mime: string, content: Buffer): MultipartBody {
  const boundary = '----notiz-test-boundary';
  const head =
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="file"; filename="${fileName}"\r\n` +
    `Content-Type: ${mime}\r\n\r\n`;
  return {
    payload: Buffer.concat([Buffer.from(head), content, Buffer.from(`\r\n--${boundary}--\r\n`)]),
    headers: { 'content-type': `multipart/form-data; boundary=${boundary}` },
  };
}
