import type { PageContent } from '@notiz/shared';
import type { ReactElement } from 'react';
import { PageEditor } from './PageEditor';
import styles from './PageEditor.module.css';
import { saveStatusLabel } from './saveQueue';
import { usePageContent } from './usePageContent';

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
        {saveStatusLabel[content.status]}
      </p>
      <PageEditor
        initialContent={initialContent}
        onChange={content.save}
        uploadFile={content.upload}
      />
    </>
  );
}
