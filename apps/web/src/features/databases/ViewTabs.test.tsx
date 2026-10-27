// @vitest-environment jsdom
import type { DatabaseView } from '@notiz/shared';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ViewTabs } from './ViewTabs';

function view(id: string, name: string): DatabaseView {
  return {
    id,
    databaseId: 'db',
    type: 'table',
    name,
    sortOrder: id,
    config: { filters: [], sorts: [], columns: [], groupByPropertyId: null, cardPropertyIds: [] },
  };
}

function renderTabs(views: DatabaseView[], activeId: string): { onDelete: () => void } {
  const onDelete = vi.fn();
  render(
    <ViewTabs
      views={views}
      activeId={activeId}
      onSelect={() => undefined}
      onAdd={() => undefined}
      onRename={() => undefined}
      onDelete={onDelete}
    />,
  );
  return { onDelete };
}

describe('ViewTabs', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  // Regression: deleting was only possible from the "+" (add view) menu, so users could not find it.
  it('deletes the active view from a button next to its tab', () => {
    vi.stubGlobal('confirm', () => true);
    const { onDelete } = renderTabs([view('a', 'Table'), view('b', 'Table 2')], 'b');
    fireEvent.click(screen.getByRole('button', { name: 'Delete view Table 2' }));
    expect(onDelete).toHaveBeenCalledWith('b');
  });

  it('keeps the view when the confirmation is cancelled', () => {
    vi.stubGlobal('confirm', () => false);
    const { onDelete } = renderTabs([view('a', 'Table'), view('b', 'Table 2')], 'b');
    fireEvent.click(screen.getByRole('button', { name: 'Delete view Table 2' }));
    expect(onDelete).not.toHaveBeenCalled();
  });

  it('offers no delete button for the last view', () => {
    renderTabs([view('a', 'Table')], 'a');
    expect(screen.queryByRole('button', { name: /Delete view/ })).toBeNull();
  });
});
