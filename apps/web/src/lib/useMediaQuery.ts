import { useCallback, useSyncExternalStore } from 'react';
import { type Breakpoint, COARSE_POINTER_QUERY, PHONE_QUERY, TABLET_QUERY } from './breakpoints';

function matches(query: string): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia(query).matches;
}

/** True while the media query matches; re-renders when it starts or stops matching. */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void): (() => void) => {
      if (typeof window.matchMedia !== 'function') return () => undefined;
      const list = window.matchMedia(query);
      list.addEventListener('change', onChange);
      return () => list.removeEventListener('change', onChange);
    },
    [query],
  );
  return useSyncExternalStore(subscribe, () => matches(query));
}

export function useBreakpoint(): Breakpoint {
  const phone = useMediaQuery(PHONE_QUERY);
  const tablet = useMediaQuery(TABLET_QUERY);
  if (phone) return 'phone';
  return tablet ? 'tablet' : 'desktop';
}

/** Touch screens: no hover, and native drag-and-drop would fight with scrolling. */
export function useCoarsePointer(): boolean {
  return useMediaQuery(COARSE_POINTER_QUERY);
}
