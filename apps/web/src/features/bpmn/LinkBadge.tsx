import type { DiagramLink } from '@notiz/shared';
import type { ReactElement } from 'react';
import { Link } from 'react-router';
import { OptionPill } from '../databases/OptionPill';
import styles from './Bpmn.module.css';
import { targetLabel } from './linkTargets';

export function rowCountLabel(count: number): string {
  return count === 1 ? '1 row' : `${count} rows`;
}

/** Hover text: what the badge opens, plus a linked database's description. */
export function badgeTooltip(link: DiagramLink): string {
  const opens = `Open ${targetLabel(link)}`;
  const description = link.description?.trim() ?? '';
  return description === '' ? opens : `${opens}\n${description}`;
}

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
