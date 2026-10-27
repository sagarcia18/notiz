import {
  DEFAULT_BPMN_XML,
  MAX_DIAGRAM_LENGTH,
  type PageDetail,
  pageDetailSchema,
} from '@notiz/shared';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { PageApi, errorCode } from './pageApi.js';

const diagramWithTask = (name: string): string =>
  DEFAULT_BPMN_XML.replace(
    '<bpmn:startEvent id="StartEvent_1" />',
    `<bpmn:startEvent id="StartEvent_1" name="Start" /><bpmn:task id="Task_1" name="${name}" />`,
  );

describe('bpmn diagram pages', () => {
  let api: PageApi;

  beforeEach(() => {
    api = new PageApi();
  });

  afterEach(async () => {
    await api.close();
  });

  async function createDiagram(parentId: string | null = null): Promise<PageDetail> {
    const response = await api.app.inject({
      method: 'POST',
      url: '/api/pages',
      payload: { title: 'Process', kind: 'bpmn', parentId },
    });
    expect(response.statusCode).toBe(201);
    return pageDetailSchema.parse(response.json());
  }

  function saveDiagram(id: string, diagram: string): ReturnType<PageApi['remove']> {
    return api.app.inject({ method: 'PATCH', url: `/api/pages/${id}`, payload: { diagram } });
  }

  it('starts a new diagram page with the default diagram', async () => {
    const page = await createDiagram();
    expect(page.kind).toBe('bpmn');
    expect(page.diagram).toBe(DEFAULT_BPMN_XML);
    expect(api.searchBody(page.id)).toBe('');
  });

  it('has no diagram on other page kinds', async () => {
    const page = await api.create('Notes');
    expect(page.diagram).toBeNull();
  });

  it('saves the diagram and indexes its names for search', async () => {
    const page = await createDiagram();
    const xml = diagramWithTask('Check detección layout');
    const response = await saveDiagram(page.id, xml);
    expect(response.statusCode).toBe(200);

    const reloaded = await api.app.inject({ method: 'GET', url: `/api/pages/${page.id}` });
    expect(pageDetailSchema.parse(reloaded.json()).diagram).toBe(xml);
    expect(api.searchBody(page.id)).toBe('Start\nCheck detección layout');
  });

  it('keeps the diagram when only the title changes', async () => {
    const page = await createDiagram();
    const xml = diagramWithTask('Keep');
    await saveDiagram(page.id, xml);
    const response = await api.app.inject({
      method: 'PATCH',
      url: `/api/pages/${page.id}`,
      payload: { title: 'Renamed' },
    });
    expect(pageDetailSchema.parse(response.json()).diagram).toBe(xml);
  });

  it('rejects a diagram on a doc page', async () => {
    const page = await api.create('Notes');
    const response = await saveDiagram(page.id, DEFAULT_BPMN_XML);
    expect(response.statusCode).toBe(400);
    expect(errorCode(response.json())).toBe('validation_failed');
  });

  it('rejects block content on a diagram page', async () => {
    const page = await createDiagram();
    const response = await api.app.inject({
      method: 'PATCH',
      url: `/api/pages/${page.id}`,
      payload: { content: [] },
    });
    expect(response.statusCode).toBe(400);
  });

  it('rejects documents that are not BPMN', async () => {
    const page = await createDiagram();
    const response = await saveDiagram(page.id, '<svg></svg>');
    expect(response.statusCode).toBe(400);
    expect(errorCode(response.json())).toBe('validation_failed');
  });

  it('rejects oversized diagrams', async () => {
    const page = await createDiagram();
    const padding = ' '.repeat(MAX_DIAGRAM_LENGTH);
    const response = await saveDiagram(page.id, DEFAULT_BPMN_XML + padding);
    expect(response.statusCode).toBe(400);
  });

  it('cannot have subpages', async () => {
    const diagram = await createDiagram();
    const create = await api.app.inject({
      method: 'POST',
      url: '/api/pages',
      payload: { title: 'Child', parentId: diagram.id },
    });
    expect(create.statusCode).toBe(409);

    const page = await api.create('Loose');
    const move = await api.move(page.id, { parentId: diagram.id });
    expect(move.statusCode).toBe(409);
  });

  it('can live under a doc page and is removed with it forever', async () => {
    const parent = await api.create('Folder');
    const diagram = await createDiagram(parent.id);
    expect((await api.remove(parent.id)).statusCode).toBe(204);
    expect((await api.purge(parent.id)).statusCode).toBe(204);
    expect(api.searchBody(diagram.id)).toBeUndefined();
    const response = await api.app.inject({ method: 'GET', url: `/api/pages/${diagram.id}` });
    expect(response.statusCode).toBe(404);
  });
});
