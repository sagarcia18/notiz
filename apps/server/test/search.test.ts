import { searchResultListSchema, toFtsQuery } from '@notiz/shared';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DatabaseApi } from './databaseApi.js';
import { errorCode } from './pageApi.js';

describe('toFtsQuery', () => {
  it('quotes every word as a prefix and drops quotes', () => {
    expect(toFtsQuery('  fire "alarm  ')).toBe('"fire"* "alarm"*');
    expect(toFtsQuery('NOT OR -x')).toBe('"NOT"* "OR"* "-x"*');
    expect(toFtsQuery('""')).toBe('');
  });
});

describe('search API', () => {
  let api: DatabaseApi;

  beforeEach(() => {
    api = new DatabaseApi();
  });

  afterEach(async () => {
    await api.close();
  });

  async function search(query: string): Promise<{ status: number; body: unknown }> {
    const response = await api.app.inject({ method: 'GET', url: `/api/search?${query}` });
    return { status: response.statusCode, body: response.json() };
  }

  async function titlesFor(q: string): Promise<string[]> {
    const { body } = await search(`q=${encodeURIComponent(q)}`);
    return searchResultListSchema.parse(body).map((result) => result.title);
  }

  it('finds pages by title prefix, accent-insensitive', async () => {
    await api.create('Café notes');
    await api.create('Shopping');
    expect(await titlesFor('cafe')).toEqual(['Café notes']);
    expect(await titlesFor('shop')).toEqual(['Shopping']);
  });

  it('requires every word and treats FTS syntax as text', async () => {
    await api.create('Fire alarm plan');
    await api.create('Fire drill');
    expect(await titlesFor('fire alarm')).toEqual(['Fire alarm plan']);
    expect(await titlesFor('fire OR "drill')).toEqual([]);
  });

  it('marks database rows and skips trashed pages', async () => {
    const database = await api.createDatabase('Tasks');
    const row = await api.addRow(database.id, 'Install detectors');
    const trashed = await api.create('Install old panel');
    await api.remove(trashed.id);

    const { body } = await search('q=install');
    const results = searchResultListSchema.parse(body);
    expect(results.map((result) => result.id)).toEqual([row.id]);
    expect(results[0]?.databaseId).toBe(database.id);
  });

  it('respects the limit', async () => {
    for (const title of ['Plan A', 'Plan B', 'Plan C']) await api.create(title);
    const { body } = await search('q=plan&limit=2');
    expect(searchResultListSchema.parse(body)).toHaveLength(2);
  });

  it('rejects an empty query and a too large limit', async () => {
    const empty = await search('q=%20');
    expect(empty.status).toBe(400);
    expect(errorCode(empty.body)).toBe('validation_failed');
    expect((await search('q=x&limit=500')).status).toBe(400);
  });
});
