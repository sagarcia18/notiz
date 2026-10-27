import {
  type DiagramUsage,
  DEFAULT_BPMN_XML,
  diagramUsageListSchema,
  pageDetailSchema,
} from '@notiz/shared';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { rebuildDiagramLinks } from '../src/services/diagramLinks.service.js';
import { diagramLinking } from './diagramXml.js';
import { PageApi } from './pageApi.js';

describe('diagram usages API', () => {
  let api: PageApi;

  beforeEach(() => {
    api = new PageApi();
  });

  afterEach(async () => {
    await api.close();
  });

  async function createDiagram(title: string): Promise<string> {
    const created = await api.app.inject({
      method: 'POST',
      url: '/api/pages',
      payload: { title, kind: 'bpmn' },
    });
    return pageDetailSchema.parse(created.json()).id;
  }

  async function saveDiagram(id: string, diagram: string): Promise<void> {
    const saved = await api.app.inject({
      method: 'PATCH',
      url: `/api/pages/${id}`,
      payload: { diagram },
    });
    expect(saved.statusCode).toBe(200);
  }

  async function usages(pageId: string): Promise<DiagramUsage[]> {
    const response = await api.app.inject({
      method: 'GET',
      url: `/api/pages/${pageId}/diagram-usages`,
    });
    expect(response.statusCode).toBe(200);
    return diagramUsageListSchema.parse(response.json());
  }

  function linkCount(): number {
    return (
      api.db.$client.prepare<[], { n: number }>('select count(*) as n from diagram_links').get()
        ?.n ?? 0
    );
  }

  it('lists each linking diagram once, by title', async () => {
    const spec = await api.create('Spec');
    const onboarding = await createDiagram('Onboarding');
    const billing = await createDiagram('Billing');
    await saveDiagram(onboarding, diagramLinking({ Task_1: spec.id, Task_2: spec.id }));
    await saveDiagram(billing, diagramLinking({ Task_1: spec.id }));

    expect(await usages(spec.id)).toEqual([
      { diagramId: billing, title: 'Billing', icon: null },
      { diagramId: onboarding, title: 'Onboarding', icon: null },
    ]);
  });

  it('follows the latest save when a link is removed', async () => {
    const spec = await api.create('Spec');
    const diagram = await createDiagram('Process');
    await saveDiagram(diagram, diagramLinking({ Task_1: spec.id }));
    await saveDiagram(diagram, DEFAULT_BPMN_XML);
    expect(await usages(spec.id)).toEqual([]);
  });

  it('hides trashed diagrams and removes the rows of purged ones', async () => {
    const spec = await api.create('Spec');
    const diagram = await createDiagram('Process');
    await saveDiagram(diagram, diagramLinking({ Task_1: spec.id }));

    await api.app.inject({ method: 'DELETE', url: `/api/pages/${diagram}` });
    expect(await usages(spec.id)).toEqual([]);
    await api.app.inject({ method: 'POST', url: `/api/trash/${diagram}/restore` });
    expect(await usages(spec.id)).toHaveLength(1);

    await api.app.inject({ method: 'DELETE', url: `/api/pages/${diagram}` });
    await api.app.inject({ method: 'DELETE', url: `/api/trash/${diagram}` });
    expect(linkCount()).toBe(0);
  });

  it('rebuilds the table from stored diagrams', async () => {
    const spec = await api.create('Spec');
    const diagram = await createDiagram('Process');
    api.db.$client
      .prepare('update pages set diagram_xml = ? where id = ?')
      .run(diagramLinking({ Task_1: spec.id }), diagram);
    expect(await usages(spec.id)).toEqual([]);

    rebuildDiagramLinks(api.db);
    rebuildDiagramLinks(api.db);
    expect(await usages(spec.id)).toEqual([{ diagramId: diagram, title: 'Process', icon: null }]);
    expect(linkCount()).toBe(1);
  });

  it('answers 404 for an unknown page', async () => {
    const response = await api.app.inject({
      method: 'GET',
      url: `/api/pages/${crypto.randomUUID()}/diagram-usages`,
    });
    expect(response.statusCode).toBe(404);
  });
});
