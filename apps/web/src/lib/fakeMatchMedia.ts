import { breakpointForWidth } from './breakpoints';

/**
 * Test helper: a `window.matchMedia` that answers the queries from `breakpoints.ts`
 * for a given width and pointer, and notifies listeners when `resize` is called.
 */
export interface FakeScreen {
  resize: (width: number) => void;
}

export function installFakeMatchMedia(initialWidth: number, coarsePointer = false): FakeScreen {
  let width = initialWidth;
  const listeners = new Set<() => void>();

  const evaluate = (query: string): boolean => {
    if (query.includes('pointer: coarse')) return coarsePointer;
    const breakpoint = breakpointForWidth(width);
    if (query.includes('min-width')) return breakpoint === 'tablet';
    if (query.includes('max-width')) return breakpoint === 'phone';
    return false;
  };

  const matchMedia = (query: string): MediaQueryList =>
    ({
      media: query,
      get matches() {
        return evaluate(query);
      },
      onchange: null,
      addEventListener: (_type: string, listener: () => void) => listeners.add(listener),
      removeEventListener: (_type: string, listener: () => void) => listeners.delete(listener),
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList;

  window.matchMedia = matchMedia;
  return {
    resize: (next) => {
      width = next;
      for (const listener of [...listeners]) listener();
    },
  };
}
