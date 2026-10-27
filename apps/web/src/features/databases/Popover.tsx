import {
  type CSSProperties,
  type ReactElement,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from 'react';
import styles from './Database.module.css';

interface PopoverProps {
  label: ReactNode;
  title?: string;
  buttonClassName?: string;
  alignRight?: boolean;
  children: ReactNode;
}

const GAP = 4;

/**
 * Fixed position below the button, so scrolling containers (the table) cannot
 * clip the panel. Coordinates are taken when the panel opens.
 */
function panelPosition(button: HTMLElement, alignRight: boolean): CSSProperties {
  const box = button.getBoundingClientRect();
  return alignRight
    ? { top: box.bottom + GAP, right: window.innerWidth - box.right }
    : { top: box.bottom + GAP, left: box.left };
}

/** A button that opens a panel below it; clicking outside or scrolling the page closes it. */
export function Popover({
  label,
  title,
  buttonClassName,
  alignRight = false,
  children,
}: PopoverProps): ReactElement {
  const [position, setPosition] = useState<CSSProperties | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const open = position !== null;

  useEffect(() => {
    if (!open) return undefined;
    const closeOnOutsideScroll = (event: Event): void => {
      if (!(event.target instanceof Node && panelRef.current?.contains(event.target))) {
        setPosition(null);
      }
    };
    const close = (): void => setPosition(null);
    window.addEventListener('scroll', closeOnOutsideScroll, true);
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('scroll', closeOnOutsideScroll, true);
      window.removeEventListener('resize', close);
    };
  }, [open]);

  return (
    <span className={styles.popoverAnchor}>
      <button
        ref={buttonRef}
        type="button"
        className={buttonClassName ?? styles.button}
        title={title}
        aria-expanded={open}
        onClick={() => {
          const button = buttonRef.current;
          setPosition(open || !button ? null : panelPosition(button, alignRight));
        }}
      >
        {label}
      </button>
      {position && (
        <>
          <div className={styles.backdrop} onClick={() => setPosition(null)} />
          <div ref={panelRef} className={styles.popover} style={position}>
            {children}
          </div>
        </>
      )}
    </span>
  );
}
