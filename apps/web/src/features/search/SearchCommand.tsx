import type { PageTreeNode, SearchResult } from '@notiz/shared';
import { type ReactElement, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { usePageTree } from '../pages/usePages';
import styles from './SearchCommand.module.css';
import { SearchPalette } from './SearchPalette';
import { useDebouncedValue, useSearch } from './useSearch';

/** Ctrl+K (Cmd+K on macOS) toggles the palette, also while typing in the editor. */
export function isPaletteShortcut(event: KeyboardEvent): boolean {
  return (event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === 'k';
}

function titlesById(nodes: PageTreeNode[], into = new Map<string, string>()): Map<string, string> {
  for (const node of nodes) {
    into.set(node.id, node.title || 'Untitled');
    titlesById(node.children, into);
  }
  return into;
}

function Palette({ onClose }: { onClose: () => void }): ReactElement {
  const [query, setQuery] = useState('');
  const search = useSearch(useDebouncedValue(query));
  const tree = usePageTree();
  const navigate = useNavigate();
  const titles = useMemo(() => titlesById(tree.data ?? []), [tree.data]);
  const results = query.trim() === '' ? [] : (search.data ?? []);

  const contextOf = (result: SearchResult): string | null =>
    result.databaseId === null ? null : `in ${titles.get(result.databaseId) ?? 'a database'}`;

  return (
    <SearchPalette
      query={query}
      results={results}
      isSearching={search.isFetching}
      errorMessage={search.error?.message}
      contextOf={contextOf}
      onQueryChange={setQuery}
      onSelect={(result) => {
        onClose();
        void navigate(`/pages/${result.id}`);
      }}
      onClose={onClose}
    />
  );
}

/** Sidebar search entry plus the global shortcut; opens the search palette. */
export function SearchCommand(): ReactElement {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (!isPaletteShortcut(event)) return;
      event.preventDefault();
      event.stopPropagation();
      setOpen((current) => !current);
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, []);

  return (
    <>
      <button type="button" className={styles.entry} onClick={() => setOpen(true)}>
        <span>🔍 Search</span>
        <kbd className={styles.kbd}>Ctrl K</kbd>
      </button>
      {open && <Palette onClose={close} />}
    </>
  );
}
