import type { ReactElement } from 'react';
import { useParams } from 'react-router';
import { PageHeader } from './PageHeader';
import styles from './PageView.module.css';
import { usePage, useUpdatePage } from './usePages';

export function PageView(): ReactElement {
  const { pageId = '' } = useParams();
  const page = usePage(pageId);
  const updatePage = useUpdatePage(pageId);

  if (page.isPending) {
    return <p className={styles.muted}>Loading…</p>;
  }
  if (page.error) {
    return <p className={styles.error}>{page.error.message}</p>;
  }
  return (
    <article>
      <PageHeader
        key={page.data.id}
        page={page.data}
        onSave={(input) => updatePage.mutate(input)}
      />
      {updatePage.error && <p className={styles.error}>{updatePage.error.message}</p>}
      <p className={styles.muted}>The block editor arrives in Phase 2.</p>
    </article>
  );
}
