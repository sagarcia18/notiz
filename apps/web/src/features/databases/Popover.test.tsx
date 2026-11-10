// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { installFakeMatchMedia } from '../../lib/fakeMatchMedia';
import styles from './Database.module.css';
import { Popover } from './Popover';

function openPanel(): HTMLElement {
  render(
    <Popover label="Filter">
      <input aria-label="Value" />
    </Popover>,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Filter' }));
  const panel = screen.getByLabelText('Value').parentElement;
  if (!panel) throw new Error('panel missing');
  return panel;
}

describe('Popover', () => {
  afterEach(cleanup);

  it('opens a positioned panel below the button on desktop and closes on scroll', () => {
    installFakeMatchMedia(1280);
    const panel = openPanel();
    expect(panel.className).not.toContain(styles.sheet);
    expect(panel.style.top).not.toBe('');

    fireEvent.scroll(window);
    expect(screen.queryByLabelText('Value')).toBeNull();
  });

  it('opens as a bottom sheet on phones and stays open while the page scrolls', () => {
    installFakeMatchMedia(375, true);
    const panel = openPanel();
    expect(panel.className).toContain(styles.sheet);
    expect(panel.style.top).toBe('');

    // The on-screen keyboard scrolls the page and changes only the height.
    fireEvent.scroll(window);
    fireEvent(window, new Event('resize'));
    expect(screen.getByLabelText('Value')).toBeTruthy();
  });
});
