import {
  type DatabaseProperty,
  databaseAggregateResultSchema,
  databaseQueryResultSchema,
} from '@notiz/shared';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DatabaseApi } from './databaseApi.js';
import { errorCode } from './pageApi.js';

describe('database query and aggregate API', () => {
  let api: DatabaseApi;
  let databaseId: string;
  let state: DatabaseProperty;
  let hours: DatabaseProperty;
  let done: DatabaseProperty;

  beforeEach(async () => {
    api = new DatabaseApi();
    databaseId = (await api.createDatabase('Tasks')).id;
    state = await api.addProperty(databaseId, {
      name: 'State',
      type: 'status',
      options: [
        { name: 'Open', color: 'gray', group: 'todo' },
        { name: 'Doing', color: 'blue', group: 'in_progress' },
        { name: 'Done', color: 'green', group: 'complete' },
      ],
    });
    hours = await api.addProperty(databaseId, { name: 'Hours', type: 'number' });
    done = await api.addProperty(databaseId, { name: 'Billed', type: 'checkbox' });
    const [open, doing, finished] = state.options.map((option) => option.id);
    await api.addRow(databaseId, 'Plan', { [state.id]: open ?? null, [hours.id]: 2 });
    await api.addRow(databaseId, 'Build', { [state.id]: doing ?? null, [hours.id]: 8 });
    await api.addRow(databaseId, 'Ship', { [state.id]: finished ?? null, [hours.id]: 4 });
    await api.addRow(databaseId, 'Bill', { [done.id]: true });
  });

  afterEach(async () => {
    await api.close();
  });

  async function post(path: string, payload: object): Promise<{ status: number; body: unknown }> {
    const response = await api.app.inject({
      method: 'POST',
      url: `/api/databases/${databaseId}/${path}`,
      payload,
    });
    return { status: response.statusCode, body: response.json() };
  }

  async function queryTitles(payload: object): Promise<{ total: number; titles: string[] }> {
    const { body } = await post('query', payload);
    const result = databaseQueryResultSchema.parse(body);
    return { total: result.total, titles: result.rows.map((row) => row.title) };
  }

  it('returns all rows in manual order without filters', async () => {
    expect(await queryTitles({})).toEqual({ total: 4, titles: ['Plan', 'Build', 'Ship', 'Bill'] });
  });

  it('filters, sorts and pages with the total before paging', async () => {
    const filters = [{ propertyId: hours.id, operator: 'gte', value: 3 }];
    const sorts = [{ propertyId: hours.id, direction: 'desc' }];
    expect(await queryTitles({ filters, sorts })).toEqual({ total: 2, titles: ['Build', 'Ship'] });
    expect(await queryTitles({ filters, sorts, limit: 1, offset: 1 })).toEqual({
      total: 2,
      titles: ['Ship'],
    });
  });

  it('filters by status group and checkbox', async () => {
    const inGroup = { propertyId: state.id, operator: 'in_group', value: 'complete' };
    expect((await queryTitles({ filters: [inGroup] })).titles).toEqual(['Ship']);
    const billed = { propertyId: done.id, operator: 'is_checked' };
    expect((await queryTitles({ filters: [billed] })).titles).toEqual(['Bill']);
  });

  it('rejects unknown properties, unfit operators and missing values', async () => {
    const unknown = await post('query', {
      filters: [{ propertyId: crypto.randomUUID(), operator: 'is_empty' }],
    });
    expect(unknown.status).toBe(400);
    expect(errorCode(unknown.body)).toBe('validation_failed');

    const unfit = await post('query', {
      filters: [{ propertyId: done.id, operator: 'contains', value: 'x' }],
    });
    expect(unfit.status).toBe(400);
    expect(JSON.stringify(unfit.body)).toContain('is_checked');

    const noValue = await post('query', { filters: [{ propertyId: hours.id, operator: 'gt' }] });
    expect(noValue.status).toBe(400);

    const badSort = await post('query', {
      sorts: [{ propertyId: crypto.randomUUID(), direction: 'asc' }],
    });
    expect(badSort.status).toBe(400);
    expect((await post('query', { limit: 501 })).status).toBe(400);
  });

  it('is 404 for pages that are not databases', async () => {
    const page = await api.create('Doc');
    const response = await api.app.inject({
      method: 'POST',
      url: `/api/databases/${page.id}/query`,
      payload: {},
    });
    expect(response.statusCode).toBe(404);
  });

  it('counts, sums and averages filtered rows', async () => {
    const count = databaseAggregateResultSchema.parse((await post('aggregate', {})).body);
    expect(count).toEqual({ total: 4, buckets: [] });

    const sum = await post('aggregate', {
      metric: 'sum',
      metricPropertyId: hours.id,
      filters: [{ propertyId: hours.id, operator: 'is_not_empty' }],
    });
    expect(databaseAggregateResultSchema.parse(sum.body).total).toBe(14);

    const avg = await post('aggregate', { metric: 'avg', metricPropertyId: hours.id });
    expect(databaseAggregateResultSchema.parse(avg.body).total).toBeCloseTo(14 / 3);
  });

  it('groups by option and by status group, with a no-value bucket', async () => {
    const byGroup = databaseAggregateResultSchema.parse(
      (await post('aggregate', { groupByPropertyId: state.id, groupByStatusGroup: true })).body,
    );
    expect(byGroup.buckets.map(({ key, value }) => [key, value])).toEqual([
      ['todo', 1],
      ['in_progress', 1],
      ['complete', 1],
      ['__none__', 1],
    ]);

    const byOption = databaseAggregateResultSchema.parse(
      (
        await post('aggregate', {
          metric: 'sum',
          metricPropertyId: hours.id,
          groupByPropertyId: state.id,
        })
      ).body,
    );
    expect(byOption.buckets.map(({ label, value }) => [label, value])).toEqual([
      ['Open', 2],
      ['Doing', 8],
      ['Done', 4],
      ['No value', 0],
    ]);
  });

  it('rejects aggregations that do not fit the properties', async () => {
    const cases = [
      { metric: 'sum' },
      { metric: 'avg', metricPropertyId: done.id },
      { groupByPropertyId: hours.id },
      { groupByStatusGroup: true },
    ];
    for (const payload of cases) {
      const response = await post('aggregate', payload);
      expect(response.status, JSON.stringify(payload)).toBe(400);
    }
  });
});
