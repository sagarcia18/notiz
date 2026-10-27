import { type ReactElement, useCallback, useState } from 'react';
import { useNavigate } from 'react-router';
import { ImportDialog } from './ImportDialog';
import styles from './NotionImport.module.css';
import { useNotionImport } from './useNotionImport';

/** Sidebar entry that opens the Notion import dialog. */
export function NotionImport(): ReactElement {
  const [open, setOpen] = useState(false);
  const importExport = useNotionImport();
  const navigate = useNavigate();
  const { reset } = importExport;

  const close = useCallback((): void => {
    setOpen(false);
    reset();
  }, [reset]);

  return (
    <>
      <button type="button" className={styles.entry} onClick={() => setOpen(true)}>
        ⇪ Import from Notion
      </button>
      {open && (
        <ImportDialog
          isImporting={importExport.isPending}
          result={importExport.data}
          errorMessage={importExport.error?.message}
          onPick={(file) => importExport.mutate(file)}
          onOpenResult={(pageId) => {
            close();
            void navigate(`/pages/${pageId}`);
          }}
          onClose={close}
        />
      )}
    </>
  );
}
