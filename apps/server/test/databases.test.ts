import { databasePropertySchema } from '@notiz/shared';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DatabaseApi } from './databaseApi.js';
import { errorCode, titles } from './pageApi.js';

describe('databases API', () => {
  let api: DatabaseApi;

  beforeEach(() => {
    api = new DatabaseApi();
  });

  afterEach(async () => {
    await api.close();
  });

  it('creates a database with a title property and a table view', async () => {
    const database = await api.createDatabase();
    const detail = await api.database(database.id);
    expect(detail.properties.map((p) => [p.name, p.type])).toEqual([['Name', 'title']]);
    expect(detail.views.map((v) => [v.name, v.type])).toEqual([['Table', 'table']]);
  });

  it('answers not_found for pages that are not databases', async () => {
    const doc = await api.create('Doc');
    const response = await api.app.inject({ method: 'GET', url: `/api/databases/${doc.id}` });
    expect(response.statusCode).toBe(404);
  });

  it('gives a new status property default options with groups', async () => {
    const database = await api.createDatabase();
    const status = await api.addProperty(database.id, { name: 'Status', type: 'status' });
    expect(status.options.map((o) => o.group)).toEqual(['todo', 'in_progress', 'complete']);
    const select = await api.addProperty(database.id, {
      name: 'Tag',
      type: 'select',
      options: [{ name: 'A', color: 'red', group: 'complete' }],
    });
    expect(select.options).toHaveLength(1);
    expect(select.options[0]).toMatchObject({ name: 'A', color: 'red' });
    expect(select.options[0]).not.toHaveProperty('group');
  });

  it('protects the title property', async () => {
    const database = await api.createDatabase();
    const [title] = (await api.database(database.id)).properties;
    const id = title?.id ?? '';
    expect((await api.patchProperty(id, { type: 'text' })).statusCode).toBe(400);
    expect((await api.deleteProperty(id)).statusCode).toBe(400);
    const renamed = await api.patchProperty(id, { name: 'Task' });
    expect(databasePropertySchema.parse(renamed.json()).name).toBe('Task');
  });

  it('creates rows with validated values and hides them from the page tree', async () => {
    const database = await api.createDatabase();
    const points = await api.addProperty(database.id, { name: 'Points', type: 'number' });
    const row = await api.addRow(database.id, 'Write tests', { [points.id]: 3 });
    expect(row.properties).toEqual({ [points.id]: 3 });

    const bad = await api.app.inject({
      method: 'POST',
      url: `/api/databases/${database.id}/rows`,
      payload: { properties: { [points.id]: 'three' } },
    });
    expect(bad.statusCode).toBe(400);

    expect(titles(await api.tree())).toEqual(['Tasks']);
    expect((await api.tree())[0]?.children).toEqual([]);
    expect(api.searchTitles()).toContain('Write tests');
  });

  it('merges row values on PATCH and clears them with null', async () => {
    const database = await api.createDatabase();
    const done = await api.addProperty(database.id, { name: 'Done', type: 'checkbox' });
    const note = await api.addProperty(database.id, { name: 'Note', type: 'text' });
    const row = await api.addRow(database.id, 'Row', { [note.id]: 'hi' });

    expect((await api.setValues(row.id, { [done.id]: true })).statusCode).toBe(200);
    expect((await api.page(row.id)).properties).toEqual({ [note.id]: 'hi', [done.id]: true });
    await api.setValues(row.id, { [note.id]: null });
    const page = await api.page(row.id);
    expect(page).toMatchObject({ databaseId: database.id, properties: { [done.id]: true } });
  });

  it('rejects values for unknown properties, the title and normal pages', async () => {
    const database = await api.createDatabase();
    const [title] = (await api.database(database.id)).properties;
    const row = await api.addRow(database.id, 'Row');
    expect((await api.setValues(row.id, { [crypto.randomUUID()]: 'x' })).statusCode).toBe(400);
    expect((await api.setValues(row.id, { [title?.id ?? '']: 'x' })).statusCode).toBe(400);
    const doc = await api.create('Doc');
    expect((await api.setValues(doc.id, {})).statusCode).toBe(400);
  });

  it('keeps pages out of databases except through the rows endpoint', async () => {
    const database = await api.createDatabase();
    const created = await api.app.inject({
      method: 'POST',
      url: '/api/pages',
      payload: { parentId: database.id },
    });
    expect(errorCode(created.json())).toBe('conflict');
    const doc = await api.create('Doc');
    expect((await api.move(doc.id, { parentId: database.id })).statusCode).toBe(409);
  });

  it('reorders rows inside their database', async () => {
    const database = await api.createDatabase();
    const first = await api.addRow(database.id, 'First');
    const second = await api.addRow(database.id, 'Second');
    const moved = await api.move(second.id, { parentId: database.id, beforeId: first.id });
    expect(moved.statusCode).toBe(200);
    const [view] = (await api.database(database.id)).views;
    const rows = await api.viewRows(view?.id ?? '');
    expect(rows.map((r) => r.title)).toEqual(['Second', 'First']);
  });

  it('converts values when a property changes type', async () => {
    const database = await api.createDatabase();
    const estimate = await api.addProperty(database.id, { name: 'Estimate', type: 'text' });
    const a = await api.addRow(database.id, 'A', { [estimate.id]: '5' });
    const b = await api.addRow(database.id, 'B', { [estimate.id]: 'soon' });

    expect((await api.patchProperty(estimate.id, { type: 'number' })).statusCode).toBe(200);
    expect((await api.page(a.id)).properties).toEqual({ [estimate.id]: 5 });
    expect((await api.page(b.id)).properties).toEqual({});
  });

  it('clears values of removed options', async () => {
    const database = await api.createDatabase();
    const status = await api.addProperty(database.id, { name: 'Status', type: 'status' });
    const [todo, , done] = status.options;
    const row = await api.addRow(database.id, 'Row', { [status.id]: done?.id ?? '' });
    await api.patchProperty(status.id, { options: [todo] });
    expect((await api.page(row.id)).properties).toEqual({});
  });

  it('deletes a property with its values and its view settings', async () => {
    const database = await api.createDatabase();
    const status = await api.addProperty(database.id, { name: 'Status', type: 'status' });
    const board = await api.addView(database.id, 'board');
    expect(board.config.groupByPropertyId).toBe(status.id);
    const row = await api.addRow(database.id, 'Row', { [status.id]: status.options[0]?.id ?? '' });

    expect((await api.deleteProperty(status.id)).statusCode).toBe(204);
    expect((await api.page(row.id)).properties).toEqual({});
    const views = (await api.database(database.id)).views;
    expect(views.find((v) => v.id === board.id)?.config.groupByPropertyId).toBeNull();
  });

  it('removes properties and views when the database is deleted forever', async () => {
    const database = await api.createDatabase();
    await api.addProperty(database.id, { name: 'Note', type: 'text' });
    await api.addRow(database.id, 'Row');
    await api.remove(database.id);
    expect((await api.purge(database.id)).statusCode).toBe(204);
    expect(api.tableCount('db_properties')).toBe(0);
    expect(api.tableCount('db_views')).toBe(0);
  });
});
