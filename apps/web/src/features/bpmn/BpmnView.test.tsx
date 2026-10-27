// @vitest-environment jsdom
import {
  DEFAULT_BPMN_XML,
  type DiagramLink,
  type PageDetail,
  type PageTreeNode,
} from '@notiz/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BpmnView } from './BpmnView';

// bpmn-js needs real SVG layout; a fake modeler stands in for it.
const fake = vi.hoisted(() => {
  interface FakeElement {
    id: string;
    type: string;
    attrs: Record<string, unknown>;
    businessObject: { get: (name: string) => unknown };
  }

  function element(id: string, type: string): FakeElement {
    const attrs: Record<string, unknown> = {};
    return { id, type, attrs, businessObject: { get: (name) => attrs[name] } };
  }

  class FakeModeler {
    static instances: FakeModeler[] = [];
    xml = '';
    overlays: { elementId: string; html: HTMLElement }[] = [];
    readonly elements = new Map([['Task_1', element('Task_1', 'bpmn:UserTask')]]);
    private readonly handlers = new Map<string, (event: unknown) => void>();

    constructor() {
      FakeModeler.instances.push(this);
    }

    importXML(xml: string): Promise<{ warnings: [] }> {
      if (xml.includes('broken')) return Promise.reject(new Error('unparsable content'));
      this.xml = xml;
      this.overlays = [];
      return Promise.resolve({ warnings: [] });
    }

    saveXML(): Promise<{ xml: string }> {
      return Promise.resolve({ xml: this.xml });
    }

    saveSVG(): Promise<{ svg: string }> {
      return Promise.resolve({ svg: '<svg/>' });
    }

    get(name: string): unknown {
      const services: Record<string, unknown> = {
        canvas: { zoom: () => undefined },
        elementRegistry: { get: (id: string) => this.elements.get(id) },
        overlays: {
          add: (elementId: string, _type: string, overlay: { html: HTMLElement }) =>
            this.overlays.push({ elementId, html: overlay.html }),
          remove: () => {
            this.overlays = [];
          },
        },
        modeling: {
          updateProperties: (target: FakeElement, properties: Record<string, unknown>) => {
            Object.assign(target.attrs, properties);
            this.edit(`${this.xml}<!-- ${JSON.stringify(properties)} -->`);
          },
        },
      };
      return services[name];
    }

    on(event: string, callback: (event: unknown) => void): void {
      this.handlers.set(event, callback);
    }

    destroy(): void {
      this.handlers.clear();
    }

    /** Simulates a user edit. */
    edit(xml: string): void {
      this.xml = xml;
      this.handlers.get('commandStack.changed')?.({});
    }

    select(id: string): void {
      this.handlers.get('selection.changed')?.({ newSelection: [this.elements.get(id)] });
    }
  }
  return { FakeModeler };
});

vi.mock('bpmn-js/lib/Modeler', () => ({ default: fake.FakeModeler }));

const pageId = '00000000-0000-4000-8000-0000000000b1';
const specId = '00000000-0000-4000-8000-0000000000b2';
const editedXml = DEFAULT_BPMN_XML.replace('id="StartEvent_1"', 'id="StartEvent_1" name="Go"');

function detail(diagram: string): PageDetail {
  return {
    id: pageId,
    parentId: null,
    kind: 'bpmn',
    title: 'Process',
    icon: null,
    sortOrder: 'a0',
    createdAt: '2026-10-27T00:00:00.000Z',
    updatedAt: '2026-10-27T00:00:00.000Z',
    content: [],
    databaseId: null,
    properties: {},
    diagram,
    description: null,
  };
}

const tree: PageTreeNode[] = [
  {
    id: specId,
    parentId: null,
    kind: 'doc',
    title: 'Spec',
    icon: null,
    sortOrder: 'a0',
    children: [],
  },
];
let links: DiagramLink[] = [];

function bodyOf(init?: RequestInit): { diagram: string } {
  return JSON.parse(typeof init?.body === 'string' ? init.body : '') as { diagram: string };
}

const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
  const url = input instanceof Request ? input.url : String(input);
  const body: unknown =
    init?.method === 'PATCH'
      ? detail(bodyOf(init).diagram)
      : url.endsWith('/diagram-links')
        ? links
        : tree;
  return Promise.resolve(new Response(JSON.stringify(body)));
});

function savedDiagrams(): string[] {
  return fetchMock.mock.calls
    .filter(([, init]) => init?.method === 'PATCH')
    .map(([, init]) => bodyOf(init).diagram);
}

function currentModeler(): InstanceType<typeof fake.FakeModeler> {
  const modeler = fake.FakeModeler.instances.at(-1);
  if (!modeler) throw new Error('modeler not created');
  return modeler;
}

async function renderView(): Promise<void> {
  const queryClient = new QueryClient();
  render(
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>
        <BpmnView pageId={pageId} title="Process" initialXml={DEFAULT_BPMN_XML} />
      </QueryClientProvider>
    </MemoryRouter>,
  );
  await waitFor(() => expect(currentModeler().xml).toBe(DEFAULT_BPMN_XML));
}

function chooseFile(content: string): void {
  const file = new File([content], 'process.bpmn', { type: 'application/xml' });
  fireEvent.change(screen.getByLabelText('Import BPMN file'), { target: { files: [file] } });
}

describe('BpmnView', () => {
  beforeEach(() => {
    fake.FakeModeler.instances = [];
    links = [];
    fetchMock.mockClear();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('shows the stored diagram without saving it again', async () => {
    await renderView();
    expect(screen.getByRole('status').textContent).toBe('Saved');
    expect(savedDiagrams()).toEqual([]);
  });

  it('autosaves the diagram after an edit', async () => {
    await renderView();
    currentModeler().edit(editedXml);
    await screen.findByText('Unsaved changes');
    await waitFor(() => expect(savedDiagrams()).toEqual([editedXml]), { timeout: 3000 });
    await screen.findByText('Saved');
  });

  it('imports a .bpmn file and saves it', async () => {
    await renderView();
    chooseFile(editedXml);
    await waitFor(() => expect(currentModeler().xml).toBe(editedXml));
    await waitFor(() => expect(savedDiagrams()).toEqual([editedXml]), { timeout: 3000 });
  });

  it('reports a broken file and keeps the diagram unsaved', async () => {
    await renderView();
    chooseFile('<definitions>broken');
    expect((await screen.findByRole('alert')).textContent).toContain('unparsable content');
    expect(savedDiagrams()).toEqual([]);
  });

  it('shows the status of linked rows as badges on their tasks', async () => {
    links = [
      {
        elementId: 'Task_1',
        pageId: specId,
        state: 'ok',
        title: 'Check layout',
        icon: null,
        status: { id: 'doing', name: 'In progress', color: 'blue', group: 'in_progress' },
        rowCount: null,
        description: null,
      },
      {
        elementId: 'Gone',
        pageId: specId,
        state: 'ok',
        title: 'x',
        icon: null,
        status: null,
        rowCount: null,
        description: null,
      },
    ];
    await renderView();
    await waitFor(() => expect(currentModeler().overlays).toHaveLength(1));
    const [badge] = currentModeler().overlays;
    expect(badge?.elementId).toBe('Task_1');
    await waitFor(() => expect(badge?.html.textContent).toContain('In progress'));
    expect(badge?.html.querySelector('a')?.getAttribute('href')).toBe(`/pages/${specId}`);
  });

  it('links the selected task to a page and saves the diagram', async () => {
    await renderView();
    expect(screen.queryByText('Link page…')).toBeNull();
    currentModeler().select('Task_1');
    fireEvent.click(await screen.findByText('Link page…'));
    fireEvent.click(await screen.findByRole('button', { name: /Spec/ }));

    expect(currentModeler().elements.get('Task_1')?.attrs).toEqual({ 'notiz:pageId': specId });
    expect(screen.queryByRole('dialog')).toBeNull();
    await screen.findByText('Change link…');
    await waitFor(() => expect(savedDiagrams()).toHaveLength(1), { timeout: 3000 });
    expect(savedDiagrams()[0]).toContain(specId);
  });
});
