import { pageSummarySchema } from '@notiz/shared';
import { describe, expect, it, vi } from 'vitest';
import { type FetchLike, NotizApi, NotizApiError } from '../src/apiClient.js';
import { textToBlocks } from '../src/blocks.js';
import { loadMcpConfig } from '../src/config.js';

function api(fetchFn: FetchLike): NotizApi {
  return new NotizApi('http://localhost:3001/', fetchFn);
}

async function caught(promise: Promise<unknown>): Promise<NotizApiError> {
  const error: unknown = await promise.then(
    () => undefined,
    (reason: unknown) => reason,
  );
  if (!(error instanceof NotizApiError)) throw new Error('expected a NotizApiError');
  return error;
}

describe('NotizApi', () => {
  it('sends JSON bodies to the base URL without a double slash', async () => {
    const page = {
      id: crypto.randomUUID(),
      parentId: null,
      kind: 'doc',
      title: 'A',
      icon: null,
      sortOrder: 'a0',
    };
    const fetchFn = vi.fn<FetchLike>(() => Promise.resolve(Response.json(page)));
    await expect(
      api(fetchFn).post('/api/pages', { title: 'A' }, pageSummarySchema),
    ).resolves.toEqual(page);
    expect(fetchFn).toHaveBeenCalledWith('http://localhost:3001/api/pages', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{"title":"A"}',
    });
  });

  it('maps API error bodies to typed errors', async () => {
    const body = { error: { code: 'conflict', message: 'Cycle' } };
    const error = await caught(
      api(() => Promise.resolve(Response.json(body, { status: 409 }))).delete('/api/pages/x'),
    );
    expect(error).toMatchObject({ code: 'conflict', message: 'Cycle', status: 409 });
  });

  it('reports an unreachable server and unexpected answers', async () => {
    const down = await caught(
      api(() => Promise.reject(new TypeError('fetch failed'))).get('/api/x', pageSummarySchema),
    );
    expect(down.code).toBe('unreachable');
    expect(down.message).toContain('pnpm dev');

    const odd = await caught(
      api(() => Promise.resolve(Response.json({ nope: 1 }))).get('/api/x', pageSummarySchema),
    );
    expect(odd.code).toBe('bad_response');

    const html = await caught(
      api(() => Promise.resolve(new Response('<h1>502</h1>', { status: 502 }))).delete('/api/x'),
    );
    expect(html).toMatchObject({ code: 'internal', status: 502 });
  });
});

describe('textToBlocks', () => {
  it('maps line prefixes to block types and skips blank lines', () => {
    const blocks = textToBlocks('## Title\r\n\n1. first\n* bullet\n[ ] todo\nplain # text');
    expect(blocks.map(({ type, props }) => ({ type, props }))).toEqual([
      { type: 'heading', props: { level: 2 } },
      { type: 'numberedListItem', props: {} },
      { type: 'bulletListItem', props: {} },
      { type: 'checkListItem', props: { checked: false } },
      { type: 'paragraph', props: {} },
    ]);
    expect(blocks[0]?.content).toEqual([{ type: 'text', text: 'Title', styles: {} }]);
  });
});

describe('loadMcpConfig', () => {
  it('prefers NOTIZ_API_URL and falls back to the server port', () => {
    expect(loadMcpConfig({ NOTIZ_API_URL: 'http://127.0.0.1:9000' }).apiUrl).toBe(
      'http://127.0.0.1:9000',
    );
    expect(loadMcpConfig({ API_PORT: '4000' }).apiUrl).toBe('http://127.0.0.1:4000');
    expect(loadMcpConfig({ PORT: '5173' }).apiUrl).toBe('http://127.0.0.1:3001');
    expect(loadMcpConfig({}).apiUrl).toBe('http://127.0.0.1:3001');
  });
});
