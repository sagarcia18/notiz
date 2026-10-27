// @vitest-environment jsdom
import { DEFAULT_BPMN_XML, type PageDetail } from '@notiz/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BpmnView } from './BpmnView';

// bpmn-js needs real SVG layout; a fake modeler stands in for it.
const fake = vi.hoisted(() => {
  class FakeModeler {
    static instances: FakeModeler[] = [];
    xml = '';
    private readonly handlers = new Map<string, () => void>();

    constructor() {
      FakeModeler.instances.push(this);
    }

    importXML(xml: string): Promise<{ warnings: [] }> {
      if (xml.includes('broken')) return Promise.reject(new Error('unparsable content'));
      this.xml = xml;
      return Promise.resolve({ warnings: [] });
    }

    saveXML(): Promise<{ xml: string }> {
      return Promise.resolve({ xml: this.xml });
    }

    saveSVG(): Promise<{ svg: string }> {
      return Promise.resolve({ svg: '<svg/>' });
    }

    get(): { zoom: () => void } {
      return { zoom: () => undefined };
    }

    on(event: string, callback: () => void): void {
      this.handlers.set(event, callback);
    }

    destroy(): void {
      this.handlers.clear();
    }

    /** Simulates a user edit. */
    edit(xml: string): void {
      this.xml = xml;
      this.handlers.get('commandStack.changed')?.();
    }
  }
  return { FakeModeler };
});

vi.mock('bpmn-js/lib/Modeler', () => ({ default: fake.FakeModeler }));

const pageId = '00000000-0000-4000-8000-0000000000b1';
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
  };
}

const fetchMock = vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
  const body = JSON.parse(typeof init?.body === 'string' ? init.body : '') as { diagram: string };
  return Promise.resolve(new Response(JSON.stringify(detail(body.diagram))));
});

function savedDiagrams(): string[] {
  return fetchMock.mock.calls.map(([, init]) => {
    expect(init?.method).toBe('PATCH');
    return (JSON.parse(typeof init?.body === 'string' ? init.body : '') as { diagram: string })
      .diagram;
  });
}

function currentModeler(): InstanceType<typeof fake.FakeModeler> {
  const modeler = fake.FakeModeler.instances.at(-1);
  if (!modeler) throw new Error('modeler not created');
  return modeler;
}

function renderView(): void {
  const queryClient = new QueryClient();
  render(
    <QueryClientProvider client={queryClient}>
      <BpmnView pageId={pageId} title="Process" initialXml={DEFAULT_BPMN_XML} />
    </QueryClientProvider>,
  );
}

function chooseFile(content: string): void {
  const file = new File([content], 'process.bpmn', { type: 'application/xml' });
  fireEvent.change(screen.getByLabelText('Import BPMN file'), { target: { files: [file] } });
}

describe('BpmnView', () => {
  beforeEach(() => {
    fake.FakeModeler.instances = [];
    fetchMock.mockClear();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('shows the stored diagram without saving it again', async () => {
    renderView();
    await waitFor(() => expect(currentModeler().xml).toBe(DEFAULT_BPMN_XML));
    expect(screen.getByRole('status').textContent).toBe('Saved');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('autosaves the diagram after an edit', async () => {
    renderView();
    await waitFor(() => expect(currentModeler().xml).toBe(DEFAULT_BPMN_XML));

    currentModeler().edit(editedXml);
    await screen.findByText('Unsaved changes');
    await waitFor(() => expect(savedDiagrams()).toEqual([editedXml]), { timeout: 3000 });
    await screen.findByText('Saved');
  });

  it('imports a .bpmn file and saves it', async () => {
    renderView();
    await waitFor(() => expect(currentModeler().xml).toBe(DEFAULT_BPMN_XML));

    chooseFile(editedXml);
    await waitFor(() => expect(currentModeler().xml).toBe(editedXml));
    await waitFor(() => expect(savedDiagrams()).toEqual([editedXml]), { timeout: 3000 });
  });

  it('reports a broken file and keeps the diagram unsaved', async () => {
    renderView();
    await waitFor(() => expect(currentModeler().xml).toBe(DEFAULT_BPMN_XML));

    chooseFile('<definitions>broken');
    expect((await screen.findByRole('alert')).textContent).toContain('unparsable content');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
