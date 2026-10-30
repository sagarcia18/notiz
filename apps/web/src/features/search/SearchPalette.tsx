import type { PageKind, SearchResult } from '@notiz/shared';
import { type KeyboardEvent, type ReactElement, useEffect, useRef, useState } from 'react';
import { highlightParts } from './highlight';
import { createPortal } from 'react-dom';
import styles from './SearchPalette.module.css';

interface SearchPaletteProps {
  query: string;
  results: SearchResult[];
  isSearching: boolean;
  errorMessage: string | undefined;
  /** Extra line for a result, e.g. the database a row belongs to. */
  contextOf: (result: SearchResult) => string | null;
  onQueryChange: (query: string) => void;
  onSelect: (result: SearchResult) => void;
  onClose: () => void;
}

const kindIcons: Record<PageKind, string> = {
  doc: '📄',
  database: '🗃️',
  dashboard: '📊',
  bpmn: '🔀',
};

const LIST_ID = 'search-results';

function optionId(index: number): string {
  return `search-result-${index}`;
}

function Highlighted({ text, query }: { text: string; query: string }): ReactElement {
  return (
    <>
      {highlightParts(text, query).map((part, index) =>
        part.match ? (
          <mark key={index} className={styles.mark}>
            {part.text}
          </mark>
        ) : (
          <span key={index}>{part.text}</span>
        ),
      )}
    </>
  );
}

function statusText(props: SearchPaletteProps): string | null {
  if (props.errorMessage) return props.errorMessage;
  if (props.query.trim() === '') return 'Type to search titles and page text';
  if (props.results.length === 0) return props.isSearching ? 'Searching…' : 'No results';
  return null;
}

/** Command palette: a search box with a keyboard-navigable result list. */
export function SearchPalette(props: SearchPaletteProps): ReactElement {
  const { query, results, contextOf, onQueryChange, onSelect, onClose } = props;
  const [active, setActive] = useState(0);
  const [shownResults, setShownResults] = useState(results);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // New results start at the first one (state adjusted during render, not in an effect).
  if (shownResults !== results) {
    setShownResults(results);
    setActive(0);
  }

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const item = listRef.current?.querySelector(`#${optionId(active)}`);
    if (item instanceof HTMLElement) item.scrollIntoView?.({ block: 'nearest' });
  }, [active]);

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    const count = results.length;
    if (event.key === 'ArrowDown' && count > 0) {
      event.preventDefault();
      setActive((index) => (index + 1) % count);
    } else if (event.key === 'ArrowUp' && count > 0) {
      event.preventDefault();
      setActive((index) => (index - 1 + count) % count);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const selected = results[active];
      if (selected) onSelect(selected);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
    }
  };

  const status = statusText(props);
  // In a portal: the sidebar drawer is transformed and inert while closed on phones.
  return createPortal(
    <div className={styles.backdrop} onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search"
        className={styles.palette}
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.inputRow}>
          <input
            ref={inputRef}
            className={styles.input}
            role="combobox"
            aria-label="Search pages"
            aria-expanded={results.length > 0}
            aria-controls={LIST_ID}
            aria-activedescendant={results.length > 0 ? optionId(active) : undefined}
            aria-autocomplete="list"
            placeholder="Search pages…"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            onKeyDown={onKeyDown}
          />
          {/* Phones have no Esc key and no backdrop around the full-screen palette. */}
          <button type="button" className={styles.cancel} onClick={onClose}>
            Cancel
          </button>
        </div>
        {results.length > 0 && (
          <ul ref={listRef} id={LIST_ID} role="listbox" className={styles.list}>
            {results.map((result, index) => {
              const context = contextOf(result);
              return (
                <li
                  key={result.id}
                  id={optionId(index)}
                  role="option"
                  aria-selected={index === active}
                  className={index === active ? styles.activeItem : styles.item}
                  onMouseMove={() => setActive(index)}
                  onClick={() => onSelect(result)}
                >
                  <span className={styles.icon}>{result.icon ?? kindIcons[result.kind]}</span>
                  <span className={styles.text}>
                    <span className={styles.title}>
                      <Highlighted text={result.title || 'Untitled'} query={query} />
                    </span>
                    {context && <span className={styles.context}>{context}</span>}
                    {result.snippet !== '' && (
                      <span className={styles.snippet}>
                        <Highlighted text={result.snippet} query={query} />
                      </span>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
        {status && <p className={props.errorMessage ? styles.error : styles.status}>{status}</p>}
        <p className={styles.keys}>↑↓ to move · Enter to open · Esc to close</p>
      </div>
    </div>,
    document.body,
  );
}
