import { databaseViewSchema } from '@notiz/shared';
import type { LightMyRequestResponse } from 'fastify';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DatabaseApi } from './databaseApi.js';
import { errorCode } from './pageApi.js';

describe('views API', () => {
  let api: DatabaseApi;

  beforeEach(() => {
    api = new DatabaseApi();
  });

  afterEach(async () => {
    await api.close();
  });

  it('filters and sorts rows by the view config', async () => {
    const database = await api.createDatabase();
    const points = await api.addProperty(database.id, { name: 'Points', type: 'number' });
    await api.addRow(database.id, 'Small', { [points.id]: 1 });
    await api.addRow(database.id, 'Big', { [points.id]: 8 });
    await api.addRow(database.id, 'Medium', { [points.id]: 3 });
    await api.addRow(database.id, 'None');
    const [view] = (await api.database(database.id)).views;
    const viewId = view?.id ?? '';

    const response = await api.patchView(viewId, {
      config: {
        filters: [{ propertyId: points.id, operator: 'gte', value: 2 }],
        sorts: [{ propertyId: points.id, direction: 'desc' }],
      },
    });
    expect(response.statusCode).toBe(200);
    expect(databaseViewSchema.parse(response.json()).config.columns).toEqual([]);
    expect((await api.viewRows(viewId)).map((r) => r.title)).toEqual(['Big', 'Medium']);
  });

  it('renames views and keeps at least one', async () => {
    const database = await api.createDatabase();
    const board = await api.addView(database.id, 'board');
    expect(board.name).toBe('Board');
    const renamed = await api.patchView(board.id, { name: 'Kanban' });
    expect(databaseViewSchema.parse(renamed.json()).name).toBe('Kanban');

    const [table] = (await api.database(database.id)).views;
    const del = (id: string): Promise<LightMyRequestResponse> =>
      api.app.inject({ method: 'DELETE', url: `/api/views/${id}` });
    expect((await del(table?.id ?? '')).statusCode).toBe(204);
    const last = await del(board.id);
    expect(last.statusCode).toBe(409);
    expect(errorCode(last.json())).toBe('conflict');
  });

  it('rejects invalid view configs', async () => {
    const database = await api.createDatabase();
    const [view] = (await api.database(database.id)).views;
    const response = await api.patchView(view?.id ?? '', {
      config: { filters: [{ propertyId: 'x', operator: 'nope' }] },
    });
    expect(response.statusCode).toBe(400);
  });
});
