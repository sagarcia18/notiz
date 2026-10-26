import { pageDetailSchema } from '@notiz/shared';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildPageTree } from '../src/services/pages.service.js';
import { PageApi, errorCode, titles } from './pageApi.js';

describe('pages API', () => {
  let api: PageApi;

  beforeEach(() => {
    api = new PageApi();
  });

  afterEach(async () => {
    await api.close();
  });

  it('creates root pages and subpages in creation order', async () => {
    const first = await api.create('First');
    await api.create('Second');
    await api.create('Child A', first.id);
    await api.create('Child B', first.id);

    const tree = await api.tree();
    expect(titles(tree)).toEqual(['First', 'Second']);
    expect(titles(tree[0]?.children ?? [])).toEqual(['Child A', 'Child B']);
  });

  it('creates an untitled doc page from an empty body', async () => {
    const response = await api.app.inject({ method: 'POST', url: '/api/pages' });
    expect(response.statusCode).toBe(201);
    const page = pageDetailSchema.parse(response.json());
    expect(page).toMatchObject({ title: '', kind: 'doc', parentId: null, icon: null });
  });

  it('rejects a missing parent with not_found', async () => {
    const response = await api.app.inject({
      method: 'POST',
      url: '/api/pages',
      payload: { parentId: crypto.randomUUID() },
    });
    expect(response.statusCode).toBe(404);
    expect(errorCode(response.json())).toBe('not_found');
  });

  it('reads and renames a page and keeps the search index in sync', async () => {
    const page = await api.create('Draft');
    const response = await api.app.inject({
      method: 'PATCH',
      url: `/api/pages/${page.id}`,
      payload: { title: 'Final', icon: '📄' },
    });
    expect(response.statusCode).toBe(200);
    const read = await api.app.inject({ method: 'GET', url: `/api/pages/${page.id}` });
    expect(pageDetailSchema.parse(read.json())).toMatchObject({ title: 'Final', icon: '📄' });
    expect(api.searchTitles()).toEqual(['Final']);
  });

  it('validates ids and update bodies', async () => {
    const badId = await api.app.inject({ method: 'GET', url: '/api/pages/not-a-uuid' });
    expect(badId.statusCode).toBe(400);
    const page = await api.create('Page');
    const empty = await api.app.inject({
      method: 'PATCH',
      url: `/api/pages/${page.id}`,
      payload: {},
    });
    expect(errorCode(empty.json())).toBe('validation_failed');
  });

  it('reorders siblings before and after an anchor', async () => {
    const a = await api.create('A');
    await api.create('B');
    const c = await api.create('C');

    expect((await api.move(c.id, { parentId: null, beforeId: a.id })).statusCode).toBe(200);
    expect(titles(await api.tree())).toEqual(['C', 'A', 'B']);

    await api.move(c.id, { parentId: null, afterId: a.id });
    expect(titles(await api.tree())).toEqual(['A', 'C', 'B']);

    await api.move(a.id, { parentId: null });
    expect(titles(await api.tree())).toEqual(['C', 'B', 'A']);
  });

  it('nests a page under another page and back to the top level', async () => {
    const parent = await api.create('Parent');
    const child = await api.create('Child');

    await api.move(child.id, { parentId: parent.id });
    let tree = await api.tree();
    expect(titles(tree)).toEqual(['Parent']);
    expect(titles(tree[0]?.children ?? [])).toEqual(['Child']);

    await api.move(child.id, { parentId: null, beforeId: parent.id });
    tree = await api.tree();
    expect(titles(tree)).toEqual(['Child', 'Parent']);
  });

  it('refuses to move a page into itself or its descendants', async () => {
    const root = await api.create('Root');
    const child = await api.create('Child', root.id);
    const grandchild = await api.create('Grandchild', child.id);

    for (const target of [root.id, grandchild.id]) {
      const response = await api.move(root.id, { parentId: target });
      expect(response.statusCode).toBe(409);
      expect(errorCode(response.json())).toBe('conflict');
    }
  });

  it('refuses an anchor that is not a sibling under the target parent', async () => {
    const parent = await api.create('Parent');
    const nested = await api.create('Nested', parent.id);
    const page = await api.create('Page');
    const response = await api.move(page.id, { parentId: null, beforeId: nested.id });
    expect(response.statusCode).toBe(409);
  });
});

describe('buildPageTree', () => {
  it('drops pages whose parent is not in the list', () => {
    const page = { kind: 'doc' as const, title: '', icon: null, sortOrder: 'V' };
    const tree = buildPageTree([
      { ...page, id: 'a', parentId: null },
      { ...page, id: 'b', parentId: 'a' },
      { ...page, id: 'c', parentId: 'missing' },
    ]);
    expect(tree).toHaveLength(1);
    expect(tree[0]?.children.map((node) => node.id)).toEqual(['b']);
  });
});
