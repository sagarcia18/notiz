import {
  DEFAULT_BPMN_XML,
  type DiagramLink,
  NOTIZ_BPMN_NAMESPACE,
  diagramLinkListSchema,
  pageDetailSchema,
} from '@notiz/shared';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DatabaseApi } from './databaseApi.js';
import { errorCode } from './pageApi.js';

function diagramLinking(links: Record<string, string>): string {
  const tasks = Object.entries(links)
    .map(
      ([taskId, pageId]) =>
        `<bpmn:task id="${taskId}" name="${taskId}" notiz:pageId="${pageId}" />`,
    )
    .join('');
  return DEFAULT_BPMN_XML.replace(
    'id="Definitions_1"',
    `xmlns:notiz="${NOTIZ_BPMN_NAMESPACE}" id="Definitions_1"`,
  ).replace(
    '<bpmn:startEvent id="StartEvent_1" />',
    `<bpmn:startEvent id="StartEvent_1" />${tasks}`,
  );
}

describe('diagram links API', () => {
  let api: DatabaseApi;

  beforeEach(() => {
    api = new DatabaseApi();
  });

  afterEach(async () => {
    await api.close();
  });

  async function createDiagram(links: Record<string, string>): Promise<string> {
    const created = await api.app.inject({
      method: 'POST',
      url: '/api/pages',
      payload: { title: 'Process', kind: 'bpmn' },
    });
    const { id } = pageDetailSchema.parse(created.json());
    const saved = await api.app.inject({
      method: 'PATCH',
      url: `/api/pages/${id}`,
      payload: { diagram: diagramLinking(links) },
    });
    expect(saved.statusCode).toBe(200);
    return id;
  }

  async function links(diagramId: string): Promise<DiagramLink[]> {
    const response = await api.app.inject({
      method: 'GET',
      url: `/api/pages/${diagramId}/diagram-links`,
    });
    expect(response.statusCode).toBe(200);
    return diagramLinkListSchema.parse(response.json());
  }

  it('returns no links for a new diagram', async () => {
    expect(await links(await createDiagram({}))).toEqual([]);
  });

  it('resolves a database row with the value of its first status property', async () => {
    const database = await api.createDatabase();
    const status = await api.addProperty(database.id, { name: 'Status', type: 'status' });
    await api.addProperty(database.id, { name: 'Phase', type: 'status' });
    const doing = status.options[1];
    const row = await api.addRow(database.id, 'Check layout', { [status.id]: doing?.id ?? '' });
    const unset = await api.addRow(database.id, 'Not started');

    const diagramId = await createDiagram({ Task_1: row.id, Task_2: unset.id });
    expect(await links(diagramId)).toEqual([
      {
        elementId: 'Task_1',
        pageId: row.id,
        state: 'ok',
        title: 'Check layout',
        icon: null,
        status: doing,
      },
      {
        elementId: 'Task_2',
        pageId: unset.id,
        state: 'ok',
        title: 'Not started',
        icon: null,
        status: null,
      },
    ]);
  });

  it('resolves a normal page without a status', async () => {
    const page = await api.create('Spec');
    const [link] = await links(await createDiagram({ Task_1: page.id }));
    expect(link).toMatchObject({ state: 'ok', title: 'Spec', status: null });
  });

  it('reports trashed, purged and invalid targets as missing', async () => {
    const trashed = await api.create('Trashed');
    const purged = await api.create('Purged');
    const diagramId = await createDiagram({
      Task_1: trashed.id,
      Task_2: purged.id,
      Task_3: 'not-a-uuid',
    });
    await api.app.inject({ method: 'DELETE', url: `/api/pages/${trashed.id}` });
    await api.app.inject({ method: 'DELETE', url: `/api/pages/${purged.id}` });
    await api.app.inject({ method: 'DELETE', url: `/api/trash/${purged.id}` });

    const states = (await links(diagramId)).map((link) => [link.elementId, link.state, link.title]);
    expect(states).toEqual([
      ['Task_1', 'missing', ''],
      ['Task_2', 'missing', ''],
      ['Task_3', 'missing', ''],
    ]);
  });

  it('only answers for diagram pages', async () => {
    const page = await api.create('Notes');
    const response = await api.app.inject({
      method: 'GET',
      url: `/api/pages/${page.id}/diagram-links`,
    });
    expect(response.statusCode).toBe(400);
    expect(errorCode(response.json())).toBe('validation_failed');

    const unknown = await api.app.inject({
      method: 'GET',
      url: `/api/pages/${crypto.randomUUID()}/diagram-links`,
    });
    expect(unknown.statusCode).toBe(404);
  });
});
