import type { DiagramUsage } from '@notiz/shared';
import type { ReactElement } from 'react';
import { Link } from 'react-router';
import styles from './DiagramUsages.module.css';
import { targetLabel } from './linkTargets';

/** "Used in diagrams" line under a page header; nothing when no diagram links the page. */
export function DiagramUsages({
  usages,
}: {
  usages: readonly DiagramUsage[];
}): ReactElement | null {
  if (usages.length === 0) return null;
  return (
    <nav className={styles.usages} aria-label="Used in diagrams">
      <span className={styles.label}>Used in diagrams:</span>
      {usages.map((usage) => (
        <Link key={usage.diagramId} to={`/pages/${usage.diagramId}`} className={styles.link}>
          {usage.icon ?? '🔀'} {targetLabel(usage)}
        </Link>
      ))}
    </nav>
  );
}
