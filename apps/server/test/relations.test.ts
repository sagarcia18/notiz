import { type DatabaseProperty, databasePropertySchema } from '@notiz/shared';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DatabaseApi } from './databaseApi.js';
import { errorCode } from './pageApi.js';

describe('relation properties', () => {
  let api: DatabaseApi;
  let tasksId: string;
  let devicesId: string;

  beforeEach(async () => {
    api = new DatabaseApi();
    tasksId = (await api.createDatabase('Tasks')).id;
    devicesId = (await api.createDatabase('Devices')).id;
  });

  afterEach(async () => {
    await api.close();
  });

  function addRelation(): Promise<DatabaseProperty> {
    return api.addProperty(tasksId, {
      name: 'Devices',
      type: 'relation',
      relationDatabaseId: devicesId,
    });
  }

  it('stores the target database and accepts its rows as values', async () => {
    const relation = await addRelation();
    expect(relation).toMatchObject({
      type: 'relation',
      relationDatabaseId: devicesId,
      options: [],
    });
    expect((await api.database(tasksId)).properties.at(-1)?.relationDatabaseId).toBe(devicesId);

    const smoke = await api.addRow(devicesId, 'Smoke detector');
    const horn = await api.addRow(devicesId, 'Horn');
    const task = await api.addRow(tasksId, 'Install', { [relation.id]: [smoke.id, horn.id] });
    expect(task.properties[relation.id]).toEqual([smoke.id, horn.id]);
  });

  it('needs an active target database', async () => {
    const missing = await api.app.inject({
      method: 'POST',
      url: `/api/databases/${tasksId}/properties`,
      payload: { name: 'Devices', type: 'relation' },
    });
    expect(missing.statusCode).toBe(400);
    expect(errorCode(missing.json())).toBe('validation_failed');

    const page = await api.create('Notes');
    const notADatabase = await api.app.inject({
      method: 'POST',
      url: `/api/databases/${tasksId}/properties`,
      payload: { name: 'Devices', type: 'relation', relationDatabaseId: page.id },
    });
    expect(notADatabase.statusCode).toBe(404);
  });

  it('rejects rows of other databases, trashed rows and invalid ids', async () => {
    const relation = await addRelation();
    const task = await api.addRow(tasksId, 'Install');
    const otherRow = await api.addRow(tasksId, 'Other task');
    const trashed = await api.addRow(devicesId, 'Old strobe');
    await api.app.inject({ method: 'DELETE', url: `/api/pages/${trashed.id}` });

    for (const value of [[otherRow.id], [trashed.id], ['not-a-row'], [task.id, task.id]]) {
      const response = await api.setValues(task.id, { [relation.id]: value });
      expect(response.statusCode).toBe(400);
    }
  });

  it('keeps stored ids of rows trashed later when other values change', async () => {
    const relation = await addRelation();
    const smoke = await api.addRow(devicesId, 'Smoke detector');
    const horn = await api.addRow(devicesId, 'Horn');
    const task = await api.addRow(tasksId, 'Install', { [relation.id]: [smoke.id] });
    await api.app.inject({ method: 'DELETE', url: `/api/pages/${smoke.id}` });

    const response = await api.setValues(task.id, { [relation.id]: [smoke.id, horn.id] });
    expect(response.statusCode).toBe(200);
    expect((await api.page(task.id)).properties[relation.id]).toEqual([smoke.id, horn.id]);
  });

  it('clears values when the type or the target database changes', async () => {
    const relation = await addRelation();
    const smoke = await api.addRow(devicesId, 'Smoke detector');
    const task = await api.addRow(tasksId, 'Install', { [relation.id]: [smoke.id] });
    const rooms = await api.createDatabase('Rooms');

    const retarget = await api.patchProperty(relation.id, { relationDatabaseId: rooms.id });
    expect(databasePropertySchema.parse(retarget.json()).relationDatabaseId).toBe(rooms.id);
    expect((await api.page(task.id)).properties).toEqual({});

    await api.setValues(task.id, { [relation.id]: [(await api.addRow(rooms.id, 'Lobby')).id] });
    const toText = await api.patchProperty(relation.id, { type: 'text' });
    expect(databasePropertySchema.parse(toText.json())).toMatchObject({
      type: 'text',
      relationDatabaseId: null,
    });
    expect((await api.page(task.id)).properties).toEqual({});

    const toRelation = await api.patchProperty(relation.id, { type: 'relation' });
    expect(toRelation.statusCode).toBe(400);
  });

  it('filters rows by contains and is empty', async () => {
    const relation = await addRelation();
    const smoke = await api.addRow(devicesId, 'Smoke detector');
    await api.addRow(tasksId, 'Install', { [relation.id]: [smoke.id] });
    await api.addRow(tasksId, 'Plan');
    const view = await api.addView(tasksId, 'table');
    const rowsWith = async (operator: string, value?: string): Promise<string[]> => {
      const filter = { propertyId: relation.id, operator, value };
      const patched = await api.patchView(view.id, {
        config: { ...view.config, filters: [filter] },
      });
      expect(patched.statusCode).toBe(200);
      return (await api.viewRows(view.id)).map((row) => row.title);
    };

    expect(await rowsWith('contains', smoke.id)).toEqual(['Install']);
    expect(await rowsWith('not_contains', smoke.id)).toEqual(['Plan']);
    expect(await rowsWith('is_empty')).toEqual(['Plan']);
    expect(await rowsWith('is_not_empty')).toEqual(['Install']);
  });
});
