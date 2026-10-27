// @vitest-environment jsdom
import type { DatabaseProperty, DatabaseRow } from '@notiz/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PropertyCell } from './PropertyCell';

const devicesId = '00000000-0000-4000-8000-0000000000e1';
const smokeId = '00000000-0000-4000-8000-0000000000e2';
const hornId = '00000000-0000-4000-8000-0000000000e3';

const relation: DatabaseProperty = {
  id: '00000000-0000-4000-8000-0000000000e4',
  databaseId: '00000000-0000-4000-8000-0000000000e5',
  name: 'Devices',
  type: 'relation',
  options: [],
  relationDatabaseId: devicesId,
  sortOrder: 'a1',
};

function row(id: string, title: string): DatabaseRow {
  return { id, title, icon: null, sortOrder: id, properties: {}, createdAt: '', updatedAt: '' };
}

function renderCell(value: string[]): () => void {
  const onChange = vi.fn();
  render(
    <MemoryRouter>
      <QueryClientProvider client={new QueryClient()}>
        <PropertyCell property={relation} value={value} onChange={onChange} />
      </QueryClientProvider>
    </MemoryRouter>,
  );
  return onChange;
}

describe('relation cell', () => {
  beforeEach(() => {
    const rows = [row(smokeId, 'Smoke detector'), row(hornId, 'Horn')];
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response(JSON.stringify({ total: 2, rows })))),
    );
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('shows the titles of the linked rows and queries the target database', async () => {
    renderCell([hornId]);
    await screen.findByText('Horn');
    expect(screen.queryByText('Smoke detector')).toBeNull();
    const [url, init] = vi.mocked(fetch).mock.calls[0] ?? [];
    expect(url instanceof Request ? url.url : typeof url === 'string' ? url : url?.href).toBe(
      `/api/databases/${devicesId}/query`,
    );
    expect(init?.method).toBe('POST');
  });

  it('links another row from the searchable list', async () => {
    const onChange = renderCell([hornId]);
    fireEvent.click(await screen.findByText('Horn'));
    fireEvent.change(screen.getByLabelText('Search Devices'), { target: { value: 'smoke' } });
    expect(screen.queryByRole('link', { name: 'Open Horn' })).toBeNull();
    fireEvent.click(screen.getByRole('checkbox'));
    expect(onChange).toHaveBeenCalledWith([hornId, smokeId]);
  });
});
