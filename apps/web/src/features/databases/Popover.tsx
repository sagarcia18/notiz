import {
  type CSSProperties,
  type ReactElement,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useBreakpoint } from '../../lib/useMediaQuery';
import styles from './Database.module.css';
import { panelPosition } from './popoverPosition';

interface PopoverProps {
  label: ReactNode;
  title?: string;
  buttonClassName?: string;
  alignRight?: boolean;
  children: ReactNode;
}

/**
 * A button that opens a panel below it; clicking outside or scrolling the page closes it.
 * On phones the panel is a sheet at the bottom of the screen instead.
 */
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
  const isSheet = useBreakpoint() === 'phone';

  useEffect(() => {
    if (!open) return undefined;
    const openWidth = window.innerWidth;
    const closeOnOutsideScroll = (event: Event): void => {
      if (!(event.target instanceof Node && panelRef.current?.contains(event.target))) {
        setPosition(null);
      }
    };
    // The on-screen keyboard changes the height (and may scroll); only a width change closes.
    const closeOnWidthChange = (): void => {
      if (window.innerWidth !== openWidth) setPosition(null);
    };
    if (!isSheet) window.addEventListener('scroll', closeOnOutsideScroll, true);
    window.addEventListener('resize', closeOnWidthChange);
    return () => {
      window.removeEventListener('scroll', closeOnOutsideScroll, true);
      window.removeEventListener('resize', closeOnWidthChange);
    };
  }, [open, isSheet]);

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
          const viewport = { width: window.innerWidth, height: window.innerHeight };
          setPosition(
            open || !button
              ? null
              : panelPosition(button.getBoundingClientRect(), alignRight, viewport),
          );
        }}
      >
        {label}
      </button>
      {position && (
        <>
          <div
            className={isSheet ? styles.sheetBackdrop : styles.backdrop}
            onClick={() => setPosition(null)}
          />
          <div
            ref={panelRef}
            className={isSheet ? `${styles.popover} ${styles.sheet}` : styles.popover}
            style={isSheet ? undefined : position}
          >
            {children}
          </div>
        </>
      )}
    </span>
  );
}
