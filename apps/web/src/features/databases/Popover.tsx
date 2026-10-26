import { type ReactElement, type ReactNode, useState } from 'react';
import styles from './Database.module.css';

interface PopoverProps {
  label: ReactNode;
  title?: string;
  buttonClassName?: string;
  alignRight?: boolean;
  children: ReactNode;
}

/** A button that opens a panel below it; clicking outside closes the panel. */
export function Popover({
  label,
  title,
  buttonClassName,
  alignRight = false,
  children,
}: PopoverProps): ReactElement {
  const [open, setOpen] = useState(false);
  return (
    <span className={styles.popoverAnchor}>
      <button
        type="button"
        className={buttonClassName ?? styles.button}
        title={title}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        {label}
      </button>
      {open && (
        <>
          <div className={styles.backdrop} onClick={() => setOpen(false)} />
          <div className={[styles.popover, alignRight ? styles.popoverRight : ''].join(' ')}>
            {children}
          </div>
        </>
      )}
    </span>
  );
}
