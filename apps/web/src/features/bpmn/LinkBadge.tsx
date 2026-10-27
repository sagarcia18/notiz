import type { DiagramLink } from '@notiz/shared';
import type { ReactElement } from 'react';
import { Link } from 'react-router';
import { OptionPill } from '../databases/OptionPill';
import styles from './Bpmn.module.css';
import { targetLabel } from './linkTargets';

/** Shown below a linked task: status (or title) and a link to the page. */
export function LinkBadge({ link }: { link: DiagramLink }): ReactElement {
  if (link.state === 'missing') {
    return <span className={styles.badgeMissing}>Linked page missing</span>;
  }
  const label = targetLabel(link);
  return (
    <Link
      to={`/pages/${link.pageId}`}
      className={styles.badge}
      title={`Open ${label}`}
      aria-label={`Open ${label}`}
    >
      {link.status ? (
        <OptionPill option={link.status} />
      ) : (
        <span>
          {link.icon ?? '📄'} {label}
        </span>
      )}
      <span aria-hidden="true">↗</span>
    </Link>
  );
}
