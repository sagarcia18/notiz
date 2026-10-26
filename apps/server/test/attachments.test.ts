import fs from 'node:fs';
import path from 'node:path';
import { MAX_ATTACHMENT_BYTES, attachmentSchema } from '@notiz/shared';
import type { LightMyRequestResponse } from 'fastify';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { safeFileName } from '../src/storage/attachmentFiles.js';
import { multipartFile } from './helpers.js';
import { PageApi, errorCode } from './pageApi.js';

describe('attachments API', () => {
  let api: PageApi;

  beforeEach(() => {
    api = new PageApi();
  });

  afterEach(async () => {
    await api.close();
  });

  function upload(
    pageId: string,
    fileName: string,
    content: Buffer,
    mime = 'image/png',
  ): Promise<LightMyRequestResponse> {
    return api.app.inject({
      method: 'POST',
      url: `/api/pages/${pageId}/attachments`,
      ...multipartFile(fileName, mime, content),
    });
  }

  function pageFolder(pageId: string): string {
    return path.join(api.dataDir, 'attachments', pageId);
  }

  it('stores the file on disk and serves it back', async () => {
    const page = await api.create('With image');
    const response = await upload(page.id, 'plan.png', Buffer.from('png-bytes'));
    expect(response.statusCode).toBe(201);
    const attachment = attachmentSchema.parse(response.json());
    expect(attachment).toMatchObject({ pageId: page.id, fileName: 'plan.png', size: 9 });
    expect(fs.readdirSync(pageFolder(page.id))).toEqual([`${attachment.id}-plan.png`]);

    const download = await api.app.inject({ method: 'GET', url: attachment.url });
    expect(download.statusCode).toBe(200);
    expect(download.body).toBe('png-bytes');
    expect(download.headers['content-type']).toBe('image/png');
    expect(download.headers['content-disposition']).toMatch(/^inline;/);
  });

  it('offers non-media files as downloads', async () => {
    const page = await api.create('With html');
    const response = await upload(page.id, 'x.html', Buffer.from('<p>'), 'text/html');
    const attachment = attachmentSchema.parse(response.json());
    const download = await api.app.inject({ method: 'GET', url: attachment.url });
    expect(download.headers['content-disposition']).toMatch(/^attachment;/);
  });

  it('rejects uploads to missing pages and unknown attachments', async () => {
    const missing = await upload(crypto.randomUUID(), 'a.png', Buffer.from('x'));
    expect(missing.statusCode).toBe(404);
    const download = await api.app.inject({
      method: 'GET',
      url: `/api/attachments/${crypto.randomUUID()}`,
    });
    expect(errorCode(download.json())).toBe('not_found');
  });

  it('rejects requests without a file', async () => {
    const page = await api.create('Empty upload');
    const response = await api.app.inject({
      method: 'POST',
      url: `/api/pages/${page.id}/attachments`,
      payload: {},
    });
    expect(response.statusCode).toBeGreaterThanOrEqual(400);
    expect(response.statusCode).toBeLessThan(500);
  });

  it('rejects files over the size limit and leaves nothing behind', async () => {
    const page = await api.create('Too big');
    const response = await upload(page.id, 'big.bin', Buffer.alloc(MAX_ATTACHMENT_BYTES + 1));
    expect(response.statusCode).toBe(400);
    expect(fs.readdirSync(pageFolder(page.id))).toEqual([]);
  });

  it('keeps files while trashed and removes them when deleted forever', async () => {
    const parent = await api.create('Parent');
    const child = await api.create('Child', parent.id);
    await upload(parent.id, 'a.png', Buffer.from('a'));
    await upload(child.id, 'b.png', Buffer.from('b'));

    await api.remove(parent.id);
    expect(fs.existsSync(pageFolder(child.id))).toBe(true);

    const purge = await api.purge(parent.id);
    expect(purge.statusCode).toBe(204);
    expect(fs.existsSync(pageFolder(parent.id))).toBe(false);
    expect(fs.existsSync(pageFolder(child.id))).toBe(false);
  });

  it('removes files when the trash is emptied', async () => {
    const page = await api.create('Old');
    await upload(page.id, 'a.png', Buffer.from('a'));
    await api.remove(page.id);
    await api.app.inject({ method: 'DELETE', url: '/api/trash' });
    expect(fs.existsSync(pageFolder(page.id))).toBe(false);
  });
});

describe('safeFileName', () => {
  it('strips folders and characters Windows does not allow', () => {
    expect(safeFileName('..\\..\\evil.txt')).toBe('evil.txt');
    expect(safeFileName('a:b*c?.png')).toBe('a_b_c_.png');
    expect(safeFileName('name. ')).toBe('name');
  });

  it('falls back to a name when nothing is left', () => {
    expect(safeFileName('')).toBe('file');
    expect(safeFileName('.env')).toBe('file.env');
  });
});
