import { type ReactElement, Suspense, lazy } from 'react';
import { useParams } from 'react-router';
import { DatabaseView } from '../databases/DatabaseView';
import { RowProperties } from '../databases/RowProperties';
import { PageHeader } from './PageHeader';
import styles from './PageView.module.css';
import { usePage, useUpdatePage } from './usePages';

/** BlockNote is large; load it only when a page is opened. */
const PageBody = lazy(async () => ({ default: (await import('../editor/PageBody')).PageBody }));

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
      {page.data.databaseId !== null && (
        <RowProperties
          databaseId={page.data.databaseId}
          rowId={page.data.id}
          values={page.data.properties}
        />
      )}
      {page.data.kind === 'database' ? (
        <DatabaseView key={page.data.id} databaseId={page.data.id} />
      ) : (
        <Suspense fallback={<p className={styles.muted}>Loading editor…</p>}>
          <PageBody key={page.data.id} pageId={page.data.id} initialContent={page.data.content} />
        </Suspense>
      )}
    </article>
  );
}
