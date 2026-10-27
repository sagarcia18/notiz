import type { NotionImportResult } from '@notiz/shared';
import { type ReactElement, useEffect } from 'react';
import styles from './ImportDialog.module.css';

interface ImportDialogProps {
  isImporting: boolean;
  result: NotionImportResult | undefined;
  errorMessage: string | undefined;
  onPick: (file: File) => void;
  onOpenResult: (pageId: string) => void;
  onClose: () => void;
}

function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? '' : 's'}`;
}

/** Summary line of an import, e.g. "3 pages, 1 database, 12 rows, 2 files". */
export function summarizeImport(result: NotionImportResult): string {
  return [
    plural(result.pages, 'page'),
    plural(result.databases, 'database'),
    plural(result.rows, 'row'),
    plural(result.attachments, 'file'),
  ].join(', ');
}

function Result({
  result,
  onOpen,
}: {
  result: NotionImportResult;
  onOpen: () => void;
}): ReactElement {
  return (
    <div className={styles.result}>
      <p>Imported {summarizeImport(result)}.</p>
      {result.warnings.length > 0 && (
        <details className={styles.warnings}>
          <summary>{plural(result.warnings.length, 'note')}</summary>
          <ul>
            {result.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </details>
      )}
      <button type="button" className={styles.primary} onClick={onOpen}>
        Open imported pages
      </button>
    </div>
  );
}

/** Modal to pick a Notion "Markdown & CSV" export zip and show the outcome. */
export function ImportDialog({
  isImporting,
  result,
  errorMessage,
  onPick,
  onOpenResult,
  onClose,
}: ImportDialogProps): ReactElement {
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent): void => {
      if (event.key === 'Escape' && !isImporting) onClose();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [isImporting, onClose]);

  return (
    <div className={styles.backdrop} onClick={isImporting ? undefined : onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-title"
        className={styles.dialog}
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="import-title" className={styles.title}>
          Import from Notion
        </h2>
        <p className={styles.hint}>
          In Notion choose Settings → Export, format “Markdown &amp; CSV”, include subpages and
          files. Everything is added under a new page; nothing existing is changed.
        </p>
        {!result && (
          <label className={styles.picker}>
            <span>{isImporting ? 'Importing…' : 'Choose export .zip'}</span>
            <input
              type="file"
              accept=".zip,application/zip"
              aria-label="Notion export zip"
              disabled={isImporting}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) onPick(file);
                event.target.value = '';
              }}
            />
          </label>
        )}
        {errorMessage && <p className={styles.error}>{errorMessage}</p>}
        {result && <Result result={result} onOpen={() => onOpenResult(result.rootPageId)} />}
        <button type="button" className={styles.close} disabled={isImporting} onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}
