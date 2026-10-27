// @vitest-environment jsdom
import type { DatabaseDetail, DatabaseRow, PageDetail } from '@notiz/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { StrictMode } from 'react';
import { RouterProvider, createMemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PageView } from './PageView';

// BlockNote needs a real browser; the body is not part of this test.
vi.mock('../editor/PageBody', () => ({ PageBody: () => <p>editor</p> }));
// bpmn-js needs a real browser too; only the routing to the diagram view is tested here.
vi.mock('../bpmn/BpmnView', () => ({
  BpmnView: ({ initialXml }: { initialXml: string }) => <p>diagram: {initialXml}</p>,
}));

const databaseId = '00000000-0000-4000-8000-000000000001';
const rowId = '00000000-0000-4000-8000-000000000002';
const titleId = '00000000-0000-4000-8000-000000000003';
const viewId = '00000000-0000-4000-8000-000000000004';
const diagramId = '00000000-0000-4000-8000-000000000005';

function page(id: string, title: string, extra: Partial<PageDetail>): PageDetail {
  return {
    id,
    parentId: null,
    kind: 'doc',
    title,
    icon: null,
    sortOrder: 'a0',
    createdAt: '2026-10-27T00:00:00.000Z',
    updatedAt: '2026-10-27T00:00:00.000Z',
    content: [],
    databaseId: null,
    properties: {},
    diagram: null,
    ...extra,
  };
}

const database: DatabaseDetail = {
  id: databaseId,
  properties: [
    { id: titleId, databaseId, name: 'Name', type: 'title', options: [], sortOrder: 'a0' },
  ],
  views: [
    {
      id: viewId,
      databaseId,
      type: 'table',
      name: 'Table',
      sortOrder: 'a0',
      config: { filters: [], sorts: [], columns: [], groupByPropertyId: null, cardPropertyIds: [] },
    },
  ],
};

const row: DatabaseRow = {
  id: rowId,
  title: 'Row one',
  icon: null,
  sortOrder: 'a0',
  properties: {},
  createdAt: '2026-10-27T00:00:00.000Z',
  updatedAt: '2026-10-27T00:00:00.000Z',
};

const responses: Record<string, unknown> = {
  [`/api/pages/${databaseId}`]: page(databaseId, 'Test database', { kind: 'database' }),
  [`/api/pages/${rowId}`]: page(rowId, 'Row one', { parentId: databaseId, databaseId }),
  [`/api/databases/${databaseId}`]: database,
  [`/api/views/${viewId}/rows`]: [row],
  [`/api/pages/${diagramId}`]: page(diagramId, 'Process', {
    kind: 'bpmn',
    diagram: '<definitions/>',
  }),
};

function fakeFetch(input: RequestInfo | URL): Promise<Response> {
  const url = input instanceof Request ? input.url : String(input);
  const body = responses[url];
  return Promise.resolve(
    body === undefined
      ? new Response(JSON.stringify({ error: { code: 'not_found', message: url } }), {
          status: 404,
        })
      : new Response(JSON.stringify(body)),
  );
}

function renderAt(path: string): void {
  const router = createMemoryRouter([{ path: '/pages/:pageId', element: <PageView /> }], {
    initialEntries: [path],
  });
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </StrictMode>,
  );
}

describe('PageView', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(fakeFetch));
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  // Regression: equal sibling keys left old page headers on screen after switching
  // between a database and one of its rows a few times.
  it('shows one page header when switching between a database and its row', async () => {
    const headerTitles = (): string[] =>
      screen.getAllByLabelText<HTMLInputElement>('Page title').map((input) => input.value);
    renderAt(`/pages/${databaseId}`);

    for (let round = 0; round < 3; round += 1) {
      fireEvent.click(await screen.findByRole('link', { name: 'Open' }));
      await screen.findByText('← Back to database');
      expect(headerTitles()).toEqual(['Row one']);

      fireEvent.click(screen.getByText('← Back to database'));
      await screen.findByRole('link', { name: 'Open' });
      expect(headerTitles()).toEqual(['Test database']);
    }
  });

  it('shows the diagram view instead of the editor for diagram pages', async () => {
    renderAt(`/pages/${diagramId}`);
    await screen.findByText('diagram: <definitions/>');
    expect(screen.queryByText('editor')).toBeNull();
  });
});
