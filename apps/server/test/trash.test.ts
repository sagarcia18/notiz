import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { PageApi, titles } from './pageApi.js';

describe('trash API', () => {
  let api: PageApi;

  beforeEach(() => {
    api = new PageApi();
  });

  afterEach(async () => {
    await api.close();
  });

  it('trashes a page with its whole subtree and lists only the trashed root', async () => {
    const root = await api.create('Root');
    const child = await api.create('Child', root.id);
    await api.create('Grandchild', child.id);
    await api.create('Other');

    expect((await api.remove(root.id)).statusCode).toBe(204);

    expect(titles(await api.tree())).toEqual(['Other']);
    expect((await api.trash()).map((entry) => entry.title)).toEqual(['Root']);
    const read = await api.app.inject({ method: 'GET', url: `/api/pages/${child.id}` });
    expect(read.statusCode).toBe(404);
  });

  it('restores the subtree trashed together with the page', async () => {
    const root = await api.create('Root');
    const child = await api.create('Child', root.id);
    await api.create('Grandchild', child.id);
    await api.remove(root.id);

    expect((await api.restore(root.id)).statusCode).toBe(200);

    const tree = await api.tree();
    expect(titles(tree)).toEqual(['Root']);
    expect(titles(tree[0]?.children[0]?.children ?? [])).toEqual(['Grandchild']);
    expect(await api.trash()).toEqual([]);
  });

  it('keeps a subpage trashed earlier in the trash when its parent is restored', async () => {
    const root = await api.create('Root');
    const early = await api.create('Trashed earlier', root.id);
    await api.create('Kept', root.id);
    await api.remove(early.id);
    await new Promise((resolve) => setTimeout(resolve, 5));
    await api.remove(root.id);

    expect((await api.trash()).map((entry) => entry.title).sort()).toEqual([
      'Root',
      'Trashed earlier',
    ]);

    await api.restore(root.id);
    const tree = await api.tree();
    expect(titles(tree[0]?.children ?? [])).toEqual(['Kept']);
    expect((await api.trash()).map((entry) => entry.title)).toEqual(['Trashed earlier']);
  });

  it('restores a page to the top level when its parent is still in the trash', async () => {
    const root = await api.create('Root');
    const child = await api.create('Child', root.id);
    await api.remove(child.id);
    await new Promise((resolve) => setTimeout(resolve, 5));
    await api.remove(root.id);

    await api.restore(child.id);
    expect(titles(await api.tree())).toEqual(['Child']);
    expect((await api.trash()).map((entry) => entry.title)).toEqual(['Root']);
  });

  it('answers not_found for pages that are not in the trash', async () => {
    const page = await api.create('Active');
    expect((await api.restore(page.id)).statusCode).toBe(404);
    expect((await api.purge(page.id)).statusCode).toBe(404);
    expect((await api.remove(crypto.randomUUID())).statusCode).toBe(404);
  });

  it('permanently deletes one trashed subtree and its search rows', async () => {
    const root = await api.create('Root');
    await api.create('Child', root.id);
    await api.create('Other');
    await api.remove(root.id);

    expect((await api.purge(root.id)).statusCode).toBe(204);
    expect(await api.trash()).toEqual([]);
    expect(api.searchTitles()).toEqual(['Other']);
  });

  it('empties the whole trash including subpages trashed separately', async () => {
    const root = await api.create('Root');
    const child = await api.create('Child', root.id);
    await api.create('Other');
    await api.remove(child.id);
    await new Promise((resolve) => setTimeout(resolve, 5));
    await api.remove(root.id);

    const response = await api.app.inject({ method: 'DELETE', url: '/api/trash' });
    expect(response.statusCode).toBe(204);
    expect(await api.trash()).toEqual([]);
    expect(titles(await api.tree())).toEqual(['Other']);
    expect(api.searchTitles()).toEqual(['Other']);
  });
});
