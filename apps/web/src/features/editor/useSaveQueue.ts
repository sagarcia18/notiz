import { useCallback, useEffect, useState } from 'react';
import { SaveQueue, type SaveStatus } from './saveQueue';

const SAVE_DELAY_MS = 800;

export interface AutosaveState<T> {
  status: SaveStatus;
  /** Schedules a debounced save of the latest value. */
  schedule: (value: T) => void;
}

/**
 * Debounced autosave for one page; pending changes are flushed when the
 * component unmounts or the window closes. `save` is read once on mount.
 */
export function useSaveQueue<T>(save: (value: T) => Promise<void>): AutosaveState<T> {
  const [status, setStatus] = useState<SaveStatus>('saved');
  const [queue] = useState(
    () => new SaveQueue<T>({ delayMs: SAVE_DELAY_MS, onStatus: setStatus, save }),
  );

  useEffect(() => {
    const warnIfUnsaved = (event: BeforeUnloadEvent): void => {
      if (queue.hasPending()) {
        void queue.flush();
        event.preventDefault();
      }
    };
    window.addEventListener('beforeunload', warnIfUnsaved);
    return () => {
      window.removeEventListener('beforeunload', warnIfUnsaved);
      void queue.flush();
    };
  }, [queue]);

  const schedule = useCallback((value: T) => queue.schedule(value), [queue]);
  return { status, schedule };
}
