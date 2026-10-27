// @vitest-environment jsdom
import type { NotionImportResult } from '@notiz/shared';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ImportDialog, summarizeImport } from './ImportDialog';

const result: NotionImportResult = {
  rootPageId: '7f0e2a2c-4c1e-4c6b-9a43-1f3c5b9b2d11',
  pages: 3,
  databases: 1,
  rows: 12,
  attachments: 1,
  warnings: ['Tasks: Skipped person property "Assignee"'],
};

function renderDialog(props: Partial<Parameters<typeof ImportDialog>[0]> = {}) {
  const handlers = {
    onPick: vi.fn<(file: File) => void>(),
    onOpenResult: vi.fn<(pageId: string) => void>(),
    onClose: vi.fn<() => void>(),
  };
  render(
    <ImportDialog
      isImporting={false}
      result={undefined}
      errorMessage={undefined}
      {...handlers}
      {...props}
    />,
  );
  return handlers;
}

describe('ImportDialog', () => {
  afterEach(() => {
    cleanup();
  });

  it('summarizes counts with singular and plural words', () => {
    expect(summarizeImport(result)).toBe('3 pages, 1 database, 12 rows, 1 file');
  });

  it('hands the chosen zip to onPick', () => {
    const { onPick } = renderDialog();
    const file = new File(['zip'], 'export.zip', { type: 'application/zip' });
    fireEvent.change(screen.getByLabelText('Notion export zip'), { target: { files: [file] } });
    expect(onPick).toHaveBeenCalledWith(file);
  });

  it('cannot be closed while importing', () => {
    const { onClose } = renderDialog({ isImporting: true });
    expect(screen.getByText('Importing…')).toBeTruthy();
    expect(screen.getByLabelText<HTMLInputElement>('Notion export zip').disabled).toBe(true);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('shows the result with notes and opens the imported root', () => {
    const { onOpenResult } = renderDialog({ result });
    expect(screen.getByText('Imported 3 pages, 1 database, 12 rows, 1 file.')).toBeTruthy();
    expect(screen.getByText('Tasks: Skipped person property "Assignee"')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Open imported pages' }));
    expect(onOpenResult).toHaveBeenCalledWith(result.rootPageId);
  });

  it('shows errors and closes with Escape', () => {
    const { onClose } = renderDialog({ errorMessage: 'The file is not a valid zip archive' });
    expect(screen.getByText('The file is not a valid zip archive')).toBeTruthy();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });
});
