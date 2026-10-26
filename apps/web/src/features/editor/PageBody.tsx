import type { PageContent } from '@notiz/shared';
import type { ReactElement } from 'react';
import { PageEditor } from './PageEditor';
import styles from './PageEditor.module.css';
import type { SaveStatus } from './saveQueue';
import { usePageContent } from './usePageContent';

const statusLabel: Record<SaveStatus, string> = {
  saved: 'Saved',
  pending: 'Unsaved changes',
  saving: 'Saving…',
  error: 'Could not save; retrying on the next change',
};

export interface PageBodyProps {
  pageId: string;
  initialContent: PageContent;
}

/** Editor plus autosave for one page. Render with `key={pageId}`. */
export function PageBody({ pageId, initialContent }: PageBodyProps): ReactElement {
  const content = usePageContent(pageId);
  return (
    <>
      <p className={content.status === 'error' ? styles.statusError : styles.status} role="status">
        {statusLabel[content.status]}
      </p>
      <PageEditor
        initialContent={initialContent}
        onChange={content.save}
        uploadFile={content.upload}
      />
    </>
  );
}
