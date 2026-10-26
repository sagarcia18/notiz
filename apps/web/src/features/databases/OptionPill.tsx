import type { PropertyOption } from '@notiz/shared';
import type { ReactElement } from 'react';
import styles from './Database.module.css';

export function OptionPill({ option }: { option: PropertyOption }): ReactElement {
  return (
    <span className={styles.pill} data-color={option.color}>
      {option.name}
    </span>
  );
}
