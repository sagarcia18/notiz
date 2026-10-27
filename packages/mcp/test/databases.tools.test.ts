import {
  type PageDetail,
  databaseDetailSchema,
  databasePropertySchema,
  databaseRowSchema,
  diagramLinkListSchema,
  diagramUsageListSchema,
  pageDetailSchema,
} from '@notiz/shared';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { diagramLinking } from '../../../apps/server/test/diagramXml.js';
import { McpHarness, textOf } from './harness.js';

describe('database and diagram tools', () => {
  let mcp: McpHarness;

  beforeEach(async () => {
    mcp = new McpHarness();
    await mcp.connect();
  });

  afterEach(async () => {
    await mcp.close();
  });

  async function createPage(title: string, kind: string): Promise<PageDetail> {
    return pageDetailSchema.parse(await mcp.json('create_page', { title, kind }));
  }

  async function statusDatabase() {
    const database = await createPage('Tasks', 'database');
    const status = databasePropertySchema.parse(
      await mcp.json('add_database_property', {
        databaseId: database.id,
        name: 'State',
        type: 'status',
        options: [
          { name: 'Open', color: 'gray', group: 'todo' },
          { name: 'Done', color: 'green', group: 'complete' },
        ],
      }),
    );
    return { database, status };
  }

  it('adds properties and rows and reads them through a view', async () => {
    const { database, status } = await statusDatabase();
    const done = status.options.find((option) => option.name === 'Done');
    const row = databaseRowSchema.parse(
      await mcp.json('create_database_row', {
        databaseId: database.id,
        title: 'Write tests',
        properties: { [status.id]: done?.id ?? null },
      }),
    );

    const detail = databaseDetailSchema.parse(
      await mcp.json('get_database', { databaseId: database.id }),
    );
    expect(detail.properties.map((property) => property.name)).toContain('State');

    const listed = await mcp.json('list_database_rows', { databaseId: database.id });
    expect(listed).toMatchObject({
      view: { id: detail.views[0]?.id, type: 'table' },
      rows: [{ id: row.id, title: 'Write tests', properties: { [status.id]: done?.id } }],
    });
  });

  it('merges row values on update and rejects unknown views', async () => {
    const { database, status } = await statusDatabase();
    const row = databaseRowSchema.parse(
      await mcp.json('create_database_row', { databaseId: database.id, title: 'Row' }),
    );
    const open = status.options.find((option) => option.name === 'Open');
    const updated = pageDetailSchema.parse(
      await mcp.json('update_database_row', {
        rowId: row.id,
        properties: { [status.id]: open?.id ?? null },
      }),
    );
    expect(updated.properties[status.id]).toBe(open?.id);
    expect(updated.databaseId).toBe(database.id);

    const result = await mcp.call('list_database_rows', {
      databaseId: database.id,
      viewId: crypto.randomUUID(),
    });
    expect(textOf(result)).toMatch(/^not_found: /);
  });

  it('rejects invalid row values with the API message', async () => {
    const database = await createPage('Numbers', 'database');
    const amount = databasePropertySchema.parse(
      await mcp.json('add_database_property', {
        databaseId: database.id,
        name: 'Amount',
        type: 'number',
      }),
    );
    const result = await mcp.call('create_database_row', {
      databaseId: database.id,
      properties: { [amount.id]: 'many' },
    });
    expect(result.isError).toBe(true);
    expect(textOf(result)).toMatch(/^validation_failed: /);
  });

  it('writes diagram XML and resolves its links and usages', async () => {
    const { database, status } = await statusDatabase();
    const done = status.options.find((option) => option.name === 'Done');
    const row = databaseRowSchema.parse(
      await mcp.json('create_database_row', {
        databaseId: database.id,
        title: 'Install',
        properties: { [status.id]: done?.id ?? null },
      }),
    );
    const diagram = await createPage('Process', 'bpmn');
    await mcp.json('update_page', {
      id: diagram.id,
      diagram: diagramLinking({ Task_1: row.id, Task_2: database.id }),
    });

    const links = diagramLinkListSchema.parse(
      await mcp.json('get_diagram_links', { diagramId: diagram.id }),
    );
    expect(links).toMatchObject([
      { elementId: 'Task_1', state: 'ok', title: 'Install', status: { name: 'Done' } },
      { elementId: 'Task_2', state: 'ok', title: 'Tasks', rowCount: 1 },
    ]);

    const usages = diagramUsageListSchema.parse(
      await mcp.json('get_diagram_usages', { pageId: row.id }),
    );
    expect(usages).toEqual([{ diagramId: diagram.id, title: 'Process', icon: null }]);
  });

  it('refuses diagram links on non-diagram pages', async () => {
    const page = await createPage('Doc', 'doc');
    const result = await mcp.call('get_diagram_links', { diagramId: page.id });
    expect(textOf(result)).toMatch(/^validation_failed: /);
  });
});
