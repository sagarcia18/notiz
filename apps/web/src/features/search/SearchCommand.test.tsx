// @vitest-environment jsdom
import type { PageTreeNode, SearchResult } from '@notiz/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SearchCommand, isPaletteShortcut } from './SearchCommand';

const databaseId = '00000000-0000-4000-8000-000000000001';
const rowId = '00000000-0000-4000-8000-000000000002';

const tree: PageTreeNode[] = [
  {
    id: databaseId,
    parentId: null,
    kind: 'database',
    title: 'Tasks',
    icon: null,
    sortOrder: 'a0',
    children: [],
  },
];

const row: SearchResult = {
  id: rowId,
  parentId: databaseId,
  kind: 'doc',
  title: 'Write tests',
  icon: null,
  databaseId,
  snippet: '',
};

function renderCommand() {
  const router = createMemoryRouter(
    [
      { path: '/', element: <SearchCommand /> },
      { path: '/pages/:pageId', element: <p>opened page</p> },
    ],
    { initialEntries: ['/'] },
  );
  render(
    <QueryClientProvider client={new QueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return router;
}

describe('SearchCommand', () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    fetchMock.mockImplementation((input) => {
      const url = input instanceof Request ? input.url : input.toString();
      const body = url.startsWith('/api/search') ? [row] : tree;
      return Promise.resolve(new Response(JSON.stringify(body), { status: 200 }));
    });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('recognizes Ctrl+K and Cmd+K only', () => {
    const key = (init: KeyboardEventInit): boolean =>
      isPaletteShortcut(new KeyboardEvent('keydown', init));
    expect(key({ key: 'k', ctrlKey: true })).toBe(true);
    expect(key({ key: 'K', metaKey: true })).toBe(true);
    expect(key({ key: 'k' })).toBe(false);
    expect(key({ key: 'k', ctrlKey: true, altKey: true })).toBe(false);
  });

  it('opens with Ctrl+K, searches and opens the chosen database row', async () => {
    const router = renderCommand();
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.keyDown(document.body, { key: 'k', ctrlKey: true });
    const input = screen.getByRole('combobox');
    fireEvent.change(input, { target: { value: 'wri te' } });

    await screen.findByText('in Tasks');
    expect(fetchMock).toHaveBeenCalledWith('/api/search?q=wri%20te&limit=20', expect.anything());
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => expect(router.state.location.pathname).toBe(`/pages/${rowId}`));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('opens from the sidebar entry and toggles closed with Ctrl+K', () => {
    renderCommand();
    fireEvent.click(screen.getByRole('button', { name: /Search/ }));
    expect(screen.getByRole('dialog')).toBeTruthy();
    fireEvent.keyDown(screen.getByRole('combobox'), { key: 'k', ctrlKey: true });
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
