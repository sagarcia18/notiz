// @vitest-environment jsdom
import type { SearchResult } from '@notiz/shared';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SearchPalette } from './SearchPalette';
import { highlightParts } from './highlight';

function result(id: string, title: string, extra: Partial<SearchResult> = {}): SearchResult {
  return {
    id: `00000000-0000-4000-8000-00000000000${id}`,
    parentId: null,
    kind: 'doc',
    title,
    icon: null,
    databaseId: null,
    snippet: '',
    ...extra,
  };
}

const results = [
  result('1', 'Roadmap', { snippet: 'the road ahead' }),
  result('2', 'Road trip', { icon: '🚗' }),
  result('3', 'Write tests', { databaseId: '00000000-0000-4000-8000-000000000009' }),
];

function renderPalette(props: Partial<Parameters<typeof SearchPalette>[0]> = {}) {
  const handlers = {
    onQueryChange: vi.fn<(query: string) => void>(),
    onSelect: vi.fn<(result: SearchResult) => void>(),
    onClose: vi.fn<() => void>(),
  };
  render(
    <SearchPalette
      query="road"
      results={results}
      isSearching={false}
      errorMessage={undefined}
      contextOf={(found) => (found.databaseId ? 'in Tasks' : null)}
      {...handlers}
      {...props}
    />,
  );
  return { ...handlers, input: screen.getByRole('combobox') };
}

const selectedTitle = (): string | null | undefined =>
  screen
    .getAllByRole('option')
    .find((option) => option.getAttribute('aria-selected') === 'true')
    ?.querySelector('span:nth-child(2) > span')?.textContent;

describe('highlightParts', () => {
  it('marks words that start with a query word, ignoring case', () => {
    expect(highlightParts('Road and railroad', 'ROA')).toEqual([
      { text: 'Roa', match: true },
      { text: 'd and railroad', match: false },
    ]);
    expect(highlightParts('x (a+b)', 'a+')).toEqual([
      { text: 'x (', match: false },
      { text: 'a+', match: true },
      { text: 'b)', match: false },
    ]);
    expect(highlightParts('text', '  ')).toEqual([{ text: 'text', match: false }]);
  });
});

describe('SearchPalette', () => {
  afterEach(() => {
    cleanup();
  });

  it('focuses the box and shows titles, icons, context and snippets', () => {
    const { input } = renderPalette();
    expect(document.activeElement).toBe(input);
    expect(screen.getAllByRole('option')).toHaveLength(3);
    expect(screen.getByText('🚗')).toBeTruthy();
    expect(screen.getByText('in Tasks')).toBeTruthy();
    expect(screen.getAllByText('road').map((node) => node.tagName)).toContain('MARK');
  });

  it('moves with the arrow keys, wraps around and opens with Enter', () => {
    const { input, onSelect } = renderPalette();
    expect(selectedTitle()).toBe('Roadmap');
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(selectedTitle()).toBe('Road trip');
    expect(input.getAttribute('aria-activedescendant')).toBe('search-result-1');
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    expect(selectedTitle()).toBe('Write tests');
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onSelect).toHaveBeenCalledWith(results[2]);
  });

  it('follows the mouse and opens on click', () => {
    const { onSelect } = renderPalette();
    const [, second] = screen.getAllByRole('option');
    if (!second) throw new Error('missing option');
    fireEvent.mouseMove(second);
    expect(selectedTitle()).toBe('Road trip');
    fireEvent.click(second);
    expect(onSelect).toHaveBeenCalledWith(results[1]);
  });

  it('reports typing and closes with Escape or a click outside', () => {
    const { input, onQueryChange, onClose } = renderPalette();
    fireEvent.change(input, { target: { value: 'roads' } });
    expect(onQueryChange).toHaveBeenCalledWith('roads');
    fireEvent.keyDown(input, { key: 'Escape' });
    fireEvent.click(screen.getByRole('dialog').parentElement ?? document.body);
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('closes from the Cancel button, the way out on phones', () => {
    const { onClose } = renderPalette();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('explains empty, missing and failed searches', () => {
    renderPalette({ query: '', results: [] });
    expect(screen.getByText('Type to search titles and page text')).toBeTruthy();
    cleanup();
    const { input, onSelect } = renderPalette({ query: 'zzz', results: [] });
    expect(screen.getByText('No results')).toBeTruthy();
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onSelect).not.toHaveBeenCalled();
    cleanup();
    renderPalette({ results: [], errorMessage: 'Server unreachable' });
    expect(screen.getByText('Server unreachable')).toBeTruthy();
  });
});
