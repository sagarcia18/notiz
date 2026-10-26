import { healthResponseSchema } from '@notiz/shared';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, getJson, sendEmpty, sendJson } from './apiClient';

function mockFetch(status: number, body: unknown): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.resolve(new Response(JSON.stringify(body), { status }))),
  );
}

describe('getJson', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns the parsed body on success', async () => {
    mockFetch(200, { status: 'ok', database: 'ok' });
    await expect(getJson('/api/health', healthResponseSchema)).resolves.toEqual({
      status: 'ok',
      database: 'ok',
    });
  });

  it('throws ApiError with the server message on error responses', async () => {
    mockFetch(404, { error: { code: 'not_found', message: 'Page x not found' } });
    const result = getJson('/api/pages/x', healthResponseSchema);
    await expect(result).rejects.toBeInstanceOf(ApiError);
    await expect(result).rejects.toMatchObject({ status: 404, message: 'Page x not found' });
  });

  it('rejects bodies that do not match the schema', async () => {
    mockFetch(200, { status: 'broken' });
    await expect(getJson('/api/health', healthResponseSchema)).rejects.toThrow();
  });
});

describe('sendJson and sendEmpty', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sends the body as JSON and parses the response', async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve(new Response(JSON.stringify({ status: 'ok', database: 'ok' }))),
    );
    vi.stubGlobal('fetch', fetchMock);
    await sendJson('POST', '/api/x', { a: 1 }, healthResponseSchema);
    expect(fetchMock).toHaveBeenCalledWith('/api/x', {
      method: 'POST',
      body: '{"a":1}',
      headers: { accept: 'application/json', 'content-type': 'application/json' },
    });
  });

  it('throws ApiError when a 204 endpoint fails', async () => {
    mockFetch(409, { error: { code: 'conflict', message: 'Nope' } });
    await expect(sendEmpty('DELETE', '/api/x')).rejects.toMatchObject({
      status: 409,
      message: 'Nope',
    });
  });
});
