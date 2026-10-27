import type { KeyboardEvent } from 'react';

/** Enter leaves the field, which triggers its save-on-blur handler. */
export function blurOnEnter(event: KeyboardEvent<HTMLInputElement>): void {
  if (event.key === 'Enter') {
    event.currentTarget.blur();
  }
}
