import { type PageContent, pageDetailSchema } from '@notiz/shared';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { PageApi, errorCode } from './pageApi.js';

const paragraph = (text: string): PageContent[number] => ({
  id: crypto.randomUUID(),
  type: 'paragraph',
  props: {},
  content: [{ type: 'text', text, styles: {} }],
  children: [],
});

describe('page content', () => {
  let api: PageApi;

  beforeEach(() => {
    api = new PageApi();
  });

  afterEach(async () => {
    await api.close();
  });

  it('starts new pages with empty content', async () => {
    const page = await api.create('Empty');
    expect(page.content).toEqual([]);
  });

  it('saves content and returns it unchanged', async () => {
    const page = await api.create('Notes');
    const content = [paragraph('Detección de humo')];
    const response = await api.app.inject({
      method: 'PATCH',
      url: `/api/pages/${page.id}`,
      payload: { content },
    });
    expect(response.statusCode).toBe(200);

    const reloaded = await api.app.inject({ method: 'GET', url: `/api/pages/${page.id}` });
    expect(pageDetailSchema.parse(reloaded.json()).content).toEqual(content);
  });

  it('keeps the search body in sync with the content', async () => {
    const page = await api.create('Notes');
    await api.app.inject({
      method: 'PATCH',
      url: `/api/pages/${page.id}`,
      payload: { content: [paragraph('First'), paragraph('Second')] },
    });
    expect(api.searchBody(page.id)).toBe('First\nSecond');

    await api.app.inject({
      method: 'PATCH',
      url: `/api/pages/${page.id}`,
      payload: { content: [] },
    });
    expect(api.searchBody(page.id)).toBe('');
  });

  it('leaves content alone when only the title changes', async () => {
    const page = await api.create('Notes');
    const content = [paragraph('Keep me')];
    await api.app.inject({ method: 'PATCH', url: `/api/pages/${page.id}`, payload: { content } });
    const response = await api.app.inject({
      method: 'PATCH',
      url: `/api/pages/${page.id}`,
      payload: { title: 'Renamed' },
    });
    expect(pageDetailSchema.parse(response.json()).content).toEqual(content);
    expect(api.searchBody(page.id)).toBe('Keep me');
  });

  it('rejects blocks without a type', async () => {
    const page = await api.create('Notes');
    const response = await api.app.inject({
      method: 'PATCH',
      url: `/api/pages/${page.id}`,
      payload: { content: [{ content: [] }] },
    });
    expect(response.statusCode).toBe(400);
    expect(errorCode(response.json())).toBe('validation_failed');
  });
});
