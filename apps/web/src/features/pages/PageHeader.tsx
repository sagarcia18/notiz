import type { PageDetail, UpdatePageInput } from '@notiz/shared';
import { type KeyboardEvent, type ReactElement, useState } from 'react';
import styles from './PageView.module.css';

interface PageHeaderProps {
  page: PageDetail;
  onSave: (input: UpdatePageInput) => void;
}

function blurOnEnter(event: KeyboardEvent<HTMLInputElement>): void {
  if (event.key === 'Enter') {
    event.currentTarget.blur();
  }
}

/** Editable icon and title; changes are saved when a field loses focus. */
export function PageHeader({ page, onSave }: PageHeaderProps): ReactElement {
  const [title, setTitle] = useState(page.title);
  const [icon, setIcon] = useState(page.icon ?? '');

  return (
    <header className={styles.header}>
      <input
        className={styles.icon}
        aria-label="Page icon"
        placeholder="📄"
        maxLength={32}
        value={icon}
        onChange={(event) => setIcon(event.target.value)}
        onKeyDown={blurOnEnter}
        onBlur={() => {
          const next = icon.trim() === '' ? null : icon.trim();
          if (next !== page.icon) onSave({ icon: next });
        }}
      />
      <input
        className={styles.title}
        aria-label="Page title"
        placeholder="Untitled"
        maxLength={500}
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        onKeyDown={blurOnEnter}
        onBlur={() => {
          if (title !== page.title) onSave({ title });
        }}
      />
    </header>
  );
}
