// @vitest-environment jsdom
import type { DatabaseProperty, PageTreeNode } from '@notiz/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PropertyMenu } from './PropertyMenu';

const devicesId = '00000000-0000-4000-8000-0000000000f1';

const tree: PageTreeNode[] = [
  {
    id: devicesId,
    parentId: null,
    kind: 'database',
    title: 'Devices',
    icon: null,
    sortOrder: 'a0',
    children: [],
  },
];

function property(extra: Partial<DatabaseProperty>): DatabaseProperty {
  return {
    id: '00000000-0000-4000-8000-0000000000f2',
    databaseId: '00000000-0000-4000-8000-0000000000f3',
    name: 'Devices',
    type: 'text',
    options: [],
    relationDatabaseId: null,
    sortOrder: 'a1',
    ...extra,
  };
}

function renderMenu(current: DatabaseProperty): () => void {
  const onUpdate = vi.fn();
  render(
    <QueryClientProvider client={new QueryClient()}>
      <PropertyMenu property={current} onUpdate={onUpdate} onDelete={() => undefined} />
    </QueryClientProvider>,
  );
  return onUpdate;
}

describe('PropertyMenu relations', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response(JSON.stringify(tree)))),
    );
    vi.stubGlobal('confirm', () => true);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('turns a property into a relation once its database is chosen', async () => {
    const onUpdate = renderMenu(property({}));
    fireEvent.change(screen.getByDisplayValue('Text'), { target: { value: 'relation' } });
    expect(onUpdate).not.toHaveBeenCalled();
    await screen.findByRole('option', { name: /Devices/ });
    fireEvent.change(screen.getByLabelText('Related database'), { target: { value: devicesId } });
    expect(onUpdate).toHaveBeenCalledWith({ type: 'relation', relationDatabaseId: devicesId });
  });

  it('shows the target of an existing relation', async () => {
    renderMenu(property({ type: 'relation', relationDatabaseId: devicesId }));
    await screen.findByRole('option', { name: /Devices/ });
    expect(screen.getByLabelText<HTMLSelectElement>('Related database').value).toBe(devicesId);
  });
});
