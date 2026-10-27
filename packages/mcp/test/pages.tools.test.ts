import {
  type PageDetail,
  pageDetailSchema,
  pageTreeSchema,
  searchResultListSchema,
} from '@notiz/shared';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { McpHarness, textOf } from './harness.js';

const MISSING_ID = '00000000-0000-4000-8000-000000000000';

describe('page tools', () => {
  let mcp: McpHarness;

  beforeEach(async () => {
    mcp = new McpHarness();
    await mcp.connect();
  });

  afterEach(async () => {
    await mcp.close();
  });

  async function createPage(args: Record<string, unknown>): Promise<PageDetail> {
    return pageDetailSchema.parse(await mcp.json('create_page', args));
  }

  it('lists every tool', async () => {
    const { tools } = await mcp.client.listTools();
    expect(tools.map((tool) => tool.name).sort()).toEqual([
      'add_database_property',
      'create_database_row',
      'create_page',
      'get_database',
      'get_diagram_links',
      'get_diagram_usages',
      'get_page',
      'list_database_rows',
      'list_page_tree',
      'move_page',
      'search_pages',
      'trash_page',
      'update_database_row',
      'update_page',
    ]);
  });

  it('creates a page with text and reads it back as blocks and plain text', async () => {
    const page = await createPage({ title: 'Plan', text: '# Goals\n\n- Ship MCP\n[x] Tests' });
    const read = await mcp.json('get_page', { id: page.id });
    const detail = pageDetailSchema.parse(read);
    expect(detail.content.map((block) => block.type)).toEqual([
      'heading',
      'bulletListItem',
      'checkListItem',
    ]);
    expect(read).toMatchObject({ title: 'Plan', text: 'Goals\nShip MCP\nTests' });
  });

  it('builds the tree, moves pages and trashes them', async () => {
    const parent = await createPage({ title: 'Projects' });
    const child = await createPage({ title: 'Notiz', parentId: parent.id });
    const loose = await createPage({ title: 'Loose' });

    await mcp.json('move_page', { id: loose.id, parentId: parent.id });
    const tree = pageTreeSchema.parse(await mcp.json('list_page_tree'));
    expect(tree.map((node) => node.title)).toEqual(['Projects']);
    expect(tree[0]?.children.map((node) => node.id)).toEqual([child.id, loose.id]);

    await mcp.json('trash_page', { id: parent.id });
    expect(pageTreeSchema.parse(await mcp.json('list_page_tree'))).toEqual([]);
  });

  it('updates title, icon and text', async () => {
    const page = await createPage({ title: 'Draft' });
    const updated = await mcp.json('update_page', {
      id: page.id,
      title: 'Final',
      icon: '📝',
      text: 'Only line',
    });
    expect(updated).toMatchObject({ title: 'Final', icon: '📝', text: 'Only line' });
  });

  it('rejects text together with content', async () => {
    const page = await createPage({ title: 'Draft' });
    const result = await mcp.call('update_page', { id: page.id, text: 'a', content: [] });
    expect(result.isError).toBe(true);
    expect(textOf(result)).toContain('validation_failed');
  });

  it('reports API errors as tool errors', async () => {
    const missing = await mcp.call('get_page', { id: MISSING_ID });
    expect(missing.isError).toBe(true);
    expect(textOf(missing)).toMatch(/^not_found: /);

    const page = await createPage({ title: 'Doc' });
    const wrongKind = await mcp.call('update_page', { id: page.id, description: 'x' });
    expect(textOf(wrongKind)).toMatch(/^validation_failed: /);
  });

  it('rejects invalid arguments before calling the API', async () => {
    const result = await mcp.call('get_page', { id: 'not-a-uuid' });
    expect(result.isError).toBe(true);
  });

  it('searches titles and document text', async () => {
    await createPage({ title: 'Fire alarm', text: 'Detector layout for level 2' });
    await createPage({ title: 'Groceries' });
    const results = searchResultListSchema.parse(
      await mcp.json('search_pages', { query: 'detector', limit: 5 }),
    );
    expect(results.map((result) => result.title)).toEqual(['Fire alarm']);
    expect(results[0]?.snippet).toContain('Detector');
  });
});
