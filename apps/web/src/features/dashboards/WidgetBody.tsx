import type { DashboardWidget } from '@notiz/shared';
import type { ReactElement } from 'react';
import styles from './Dashboard.module.css';
import { useWidgetData } from './useDashboard';
import { BarWidget, PieWidget } from './WidgetCharts';
import { formatValue } from './widgetSettings';

const metricLabels = { count: 'rows', sum: 'sum', avg: 'average' } as const;

/** The chart or number of one widget, or why there is none yet. */
export function WidgetBody({ widget }: { widget: DashboardWidget }): ReactElement {
  const data = useWidgetData(widget);

  if (data.isPending) {
    return <p className={styles.message}>Loading…</p>;
  }
  if (data.error) {
    return <p className={styles.error}>{data.error.message}</p>;
  }
  if (data.data.state === 'unconfigured') {
    return (
      <p className={styles.message}>
        Choose a database{widget.config.type !== 'kpi' && ' and a grouping'} in ⚙.
      </p>
    );
  }
  if (data.data.state === 'source_missing') {
    return <p className={styles.message}>The database, view or property of this widget is gone.</p>;
  }
  if (widget.config.type === 'kpi') {
    return (
      <div className={styles.kpi}>
        <span className={styles.kpiValue}>{formatValue(data.data.total)}</span>
        <span className={styles.message}>{metricLabels[widget.config.metric]}</span>
      </div>
    );
  }
  const hasValues = data.data.buckets.some((bucket) => (bucket.value ?? 0) !== 0);
  if (data.data.buckets.length === 0 || (widget.config.type === 'pie' && !hasValues)) {
    return <p className={styles.message}>Nothing to show yet.</p>;
  }
  return (
    <div className={styles.chart}>
      {widget.config.type === 'bar' ? (
        <BarWidget buckets={data.data.buckets} />
      ) : (
        <PieWidget buckets={data.data.buckets} />
      )}
    </div>
  );
}
