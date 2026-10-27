import type { DiagramLink } from '@notiz/shared';
import type { ReactElement } from 'react';
import { Link } from 'react-router';
import { OptionPill } from '../databases/OptionPill';
import styles from './Bpmn.module.css';
import { badgeTooltip, rowCountLabel, targetLabel } from './linkTargets';

function BadgeContent({ link }: { link: DiagramLink }): ReactElement {
  if (link.status) return <OptionPill option={link.status} />;
  if (link.rowCount !== null) {
    return (
      <span>
        {link.icon ?? '▦'} {targetLabel(link)} · {rowCountLabel(link.rowCount)}
      </span>
    );
  }
  return (
    <span>
      {link.icon ?? '📄'} {targetLabel(link)}
    </span>
  );
}

/** Shown below a linked element: status, database size or title, and a link to the page. */
export function LinkBadge({ link }: { link: DiagramLink }): ReactElement {
  if (link.state === 'missing') {
    return <span className={styles.badgeMissing}>Linked page missing</span>;
  }
  return (
    <Link
      to={`/pages/${link.pageId}`}
      className={styles.badge}
      title={badgeTooltip(link)}
      aria-label={`Open ${targetLabel(link)}`}
    >
      <BadgeContent link={link} />
      <span aria-hidden="true">↗</span>
    </Link>
  );
}
