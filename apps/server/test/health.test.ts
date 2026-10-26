import { errorResponseSchema, healthResponseSchema } from '@notiz/shared';
import { afterEach, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import type { AppDatabase } from '../src/db/client.js';
import { createTestDatabase } from './helpers.js';

describe('GET /api/health', () => {
  let db: AppDatabase | undefined;

  afterEach(() => {
    db?.$client.close();
  });

  it('reports server and database as ok', async () => {
    db = createTestDatabase();
    const app = buildApp({ db });
    const response = await app.inject({ method: 'GET', url: '/api/health' });
    expect(response.statusCode).toBe(200);
    expect(healthResponseSchema.parse(response.json())).toEqual({ status: 'ok', database: 'ok' });
    await app.close();
  });

  it('returns the shared error shape for unknown routes', async () => {
    db = createTestDatabase();
    const app = buildApp({ db });
    const response = await app.inject({ method: 'GET', url: '/api/nope' });
    expect(response.statusCode).toBe(404);
    expect(errorResponseSchema.parse(response.json()).error.code).toBe('not_found');
    await app.close();
  });
});
