import { healthResponseSchema } from '@notiz/shared';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, getJson } from './apiClient';

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
