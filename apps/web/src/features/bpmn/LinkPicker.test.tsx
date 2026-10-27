// @vitest-environment jsdom
import type { DatabaseDetail, DatabaseRow, PageTreeNode } from '@notiz/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LinkPicker } from './LinkPicker';

const diagramId = '00000000-0000-4000-8000-0000000000c1';
const databaseId = '00000000-0000-4000-8000-0000000000c2';
const viewId = '00000000-0000-4000-8000-0000000000c3';
const rowId = '00000000-0000-4000-8000-0000000000c4';

const tree: PageTreeNode[] = [
  {
    id: diagramId,
    parentId: null,
    kind: 'bpmn',
    title: 'Process',
    icon: null,
    sortOrder: 'a0',
    children: [],
  },
  {
    id: databaseId,
    parentId: null,
    kind: 'database',
    title: 'Tasks',
    icon: null,
    sortOrder: 'a1',
    children: [],
  },
];

const database: DatabaseDetail = {
  id: databaseId,
  properties: [],
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

const rows: DatabaseRow[] = [
  {
    id: rowId,
    title: 'Wire panel',
    icon: null,
    sortOrder: 'a0',
    properties: {},
    createdAt: '',
    updatedAt: '',
  },
];

const responses: Record<string, unknown> = {
  '/api/pages/tree': tree,
  [`/api/databases/${databaseId}`]: database,
  [`/api/views/${viewId}/rows`]: rows,
};

function renderPicker(linkedPageId: string | null): { onPick: () => void; onRemove: () => void } {
  const onPick = vi.fn();
  const onRemove = vi.fn();
  render(
    <QueryClientProvider client={new QueryClient()}>
      <LinkPicker
        diagramId={diagramId}
        linkedPageId={linkedPageId}
        onPick={onPick}
        onRemove={onRemove}
        onClose={() => undefined}
      />
    </QueryClientProvider>,
  );
  return { onPick, onRemove };
}

describe('LinkPicker', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL) =>
        Promise.resolve(
          new Response(
            JSON.stringify(responses[input instanceof Request ? input.url : String(input)]),
          ),
        ),
      ),
    );
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('lists pages without the diagram itself', async () => {
    renderPicker(null);
    await screen.findByRole('button', { name: /Tasks/ });
    expect(screen.queryByRole('button', { name: /Process/ })).toBeNull();
    expect(screen.queryByText('Remove link')).toBeNull();
  });

  it('picks a row of the chosen database', async () => {
    const { onPick } = renderPicker(null);
    fireEvent.click(screen.getByText('Database rows'));
    await screen.findByRole('option', { name: 'Tasks' });
    fireEvent.change(screen.getByLabelText('Database'), { target: { value: databaseId } });
    fireEvent.click(await screen.findByRole('button', { name: /Wire panel/ }));
    expect(onPick).toHaveBeenCalledWith(rowId);
  });

  it('removes an existing link', () => {
    const { onRemove } = renderPicker(rowId);
    fireEvent.click(screen.getByText('Remove link'));
    expect(onRemove).toHaveBeenCalled();
  });
});
