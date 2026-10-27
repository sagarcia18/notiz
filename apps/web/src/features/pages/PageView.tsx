import { type ReactElement, Suspense, lazy } from 'react';
import { useParams } from 'react-router';
import { DiagramUsages } from '../bpmn/DiagramUsages';
import { useDiagramUsages } from '../bpmn/useDiagramUsages';
import { DatabaseView } from '../databases/DatabaseView';
import { RowProperties } from '../databases/RowProperties';
import { PageHeader } from './PageHeader';
import styles from './PageView.module.css';
import { usePage, useUpdatePage } from './usePages';

/** BlockNote is large; load it only when a page is opened. */
const PageBody = lazy(async () => ({ default: (await import('../editor/PageBody')).PageBody }));
/** Recharts and the grid only load for dashboards. */
const DashboardView = lazy(async () => ({
  default: (await import('../dashboards/DashboardView')).DashboardView,
}));
/** bpmn-js only loads for diagram pages. */
const BpmnView = lazy(async () => ({ default: (await import('../bpmn/BpmnView')).BpmnView }));

export function PageView(): ReactElement {
  const { pageId = '' } = useParams();
  const page = usePage(pageId);
  const updatePage = useUpdatePage(pageId);
  const usages = useDiagramUsages(pageId);

  if (page.isPending) {
    return <p className={styles.muted}>Loading…</p>;
  }
  if (page.error) {
    return <p className={styles.error}>{page.error.message}</p>;
  }
  return (
    // Keyed by page so header, panels and editor all start fresh on navigation.
    // Sibling keys must stay unique: equal keys made React leave old headers on screen.
    <article key={page.data.id}>
      <PageHeader page={page.data} onSave={(input) => updatePage.mutate(input)} />
      {usages.data && <DiagramUsages usages={usages.data} />}
      {updatePage.error && <p className={styles.error}>{updatePage.error.message}</p>}
      {page.data.databaseId !== null && (
        <RowProperties
          databaseId={page.data.databaseId}
          rowId={page.data.id}
          values={page.data.properties}
        />
      )}
      {page.data.kind === 'database' && <DatabaseView databaseId={page.data.id} />}
      {page.data.kind === 'dashboard' && (
        <Suspense fallback={<p className={styles.muted}>Loading dashboard…</p>}>
          <DashboardView dashboardId={page.data.id} />
        </Suspense>
      )}
      {page.data.kind === 'bpmn' && page.data.diagram !== null && (
        <Suspense fallback={<p className={styles.muted}>Loading diagram…</p>}>
          <BpmnView pageId={page.data.id} title={page.data.title} initialXml={page.data.diagram} />
        </Suspense>
      )}
      {page.data.kind === 'doc' && (
        <Suspense fallback={<p className={styles.muted}>Loading editor…</p>}>
          <PageBody pageId={page.data.id} initialContent={page.data.content} />
        </Suspense>
      )}
    </article>
  );
}
