import { databasePropertySchema, pageDetailSchema } from '@notiz/shared';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { McpHarness, textOf } from './harness.js';

describe('query tools', () => {
  let mcp: McpHarness;
  let databaseId: string;

  beforeEach(async () => {
    mcp = new McpHarness();
    await mcp.connect();
    const database = pageDetailSchema.parse(
      await mcp.json('create_page', { title: 'Tasks', kind: 'database' }),
    );
    databaseId = database.id;
    const state = databasePropertySchema.parse(
      await mcp.json('add_database_property', {
        databaseId,
        name: 'State',
        type: 'status',
        options: [
          { name: 'Open', color: 'gray', group: 'todo' },
          { name: 'Done', color: 'green', group: 'complete' },
        ],
      }),
    );
    const hours = databasePropertySchema.parse(
      await mcp.json('add_database_property', { databaseId, name: 'Hours', type: 'number' }),
    );
    const [open, done] = state.options.map((option) => option.id);
    const rows: [string, string | undefined, number][] = [
      ['Plan', open, 2],
      ['Build', open, 8],
      ['Ship', done, 4],
    ];
    for (const [title, status, amount] of rows) {
      await mcp.json('create_database_row', {
        databaseId,
        title,
        properties: { [state.id]: status ?? null, [hours.id]: amount },
      });
    }
  });

  afterEach(async () => {
    await mcp.close();
  });

  it('filters by option name and sorts by property name', async () => {
    const result = await mcp.json('query_database', {
      databaseId,
      filters: [{ property: 'state', operator: 'equals', value: 'open' }],
      sorts: [{ property: 'Hours', direction: 'desc' }],
    });
    expect(result).toMatchObject({
      total: 2,
      returned: 2,
      rows: [
        { values: { Name: 'Build', State: 'Open', Hours: 8 } },
        { values: { Name: 'Plan', State: 'Open', Hours: 2 } },
      ],
    });
  });

  it('pages, picks columns and filters by status group', async () => {
    const result = await mcp.json('query_database', {
      databaseId,
      filters: [{ property: 'State', operator: 'in_group', value: 'todo' }],
      columns: ['Name'],
      limit: 1,
      offset: 1,
    });
    expect(result).toEqual({
      total: 2,
      returned: 1,
      rows: [{ id: expect.any(String) as unknown, values: { Name: 'Build' } }],
    });
  });

  it('names the valid properties and options on mistakes', async () => {
    const property = await mcp.call('query_database', {
      databaseId,
      filters: [{ property: 'Owner', operator: 'is_empty' }],
    });
    expect(property.isError).toBe(true);
    expect(textOf(property)).toContain('"State", "Hours"');

    const option = await mcp.call('query_database', {
      databaseId,
      filters: [{ property: 'State', operator: 'equals', value: 'Blocked' }],
    });
    expect(textOf(option)).toContain('options are "Open", "Done"');

    const operator = await mcp.call('query_database', {
      databaseId,
      filters: [{ property: 'Hours', operator: 'contains', value: '2' }],
    });
    expect(textOf(operator)).toMatch(/^validation_failed: Operator contains/);
  });

  it('counts, sums and groups by name', async () => {
    expect(await mcp.json('aggregate_database', { databaseId })).toEqual({
      metric: 'count',
      total: 3,
      groups: [],
    });
    expect(
      await mcp.json('aggregate_database', {
        databaseId,
        metric: 'sum',
        property: 'Hours',
        groupBy: 'State',
      }),
    ).toEqual({
      metric: 'sum',
      total: 14,
      groups: [
        { label: 'Open', value: 10 },
        { label: 'Done', value: 4 },
      ],
    });
    const byGroup = await mcp.json('aggregate_database', {
      databaseId,
      groupBy: 'State',
      byStatusGroup: true,
      filters: [{ property: 'Hours', operator: 'gt', value: 3 }],
    });
    expect(byGroup).toMatchObject({
      total: 2,
      groups: [
        { label: 'To-do', value: 1 },
        { label: 'In progress', value: 0 },
        { label: 'Complete', value: 1 },
      ],
    });
  });

  it('reports aggregations that do not fit', async () => {
    const result = await mcp.call('aggregate_database', {
      databaseId,
      metric: 'avg',
      property: 'State',
    });
    expect(textOf(result)).toMatch(/^validation_failed: .*not a number property/);
  });
});
