// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { McpSwitch } from './McpSwitch';
import { formatLastUsed } from './lastUsed';

const now = new Date('2026-10-27T12:00:00.000Z');

describe('formatLastUsed', () => {
  it('counts minutes, hours and days', () => {
    expect(formatLastUsed(null, now)).toBe('Not used since the server started');
    expect(formatLastUsed('2026-10-27T11:59:30.000Z', now)).toBe('Last used just now');
    expect(formatLastUsed('2026-10-27T11:55:00.000Z', now)).toBe('Last used 5 min ago');
    expect(formatLastUsed('2026-10-27T09:00:00.000Z', now)).toBe('Last used 3 h ago');
    expect(formatLastUsed('2026-10-25T12:00:00.000Z', now)).toBe('Last used 2 d ago');
    expect(formatLastUsed('2026-10-27T12:00:05.000Z', now)).toBe('Last used just now');
  });
});

describe('McpSwitch', () => {
  afterEach(() => {
    cleanup();
  });

  function renderSwitch(props: Partial<Parameters<typeof McpSwitch>[0]> = {}) {
    const onToggle = vi.fn<(enabled: boolean) => void>();
    render(
      <McpSwitch
        enabled
        lastUsedAt="2026-10-27T11:58:00.000Z"
        now={now}
        isSaving={false}
        errorMessage={undefined}
        onToggle={onToggle}
        {...props}
      />,
    );
    return { onToggle, button: screen.getByRole('switch') };
  }

  it('shows on with the last use and turns off on click', () => {
    const { onToggle, button } = renderSwitch();
    expect(button.getAttribute('aria-checked')).toBe('true');
    expect(button.textContent).toContain('Claude (MCP): On');
    expect(screen.getByText('Last used 2 min ago')).toBeTruthy();
    fireEvent.click(button);
    expect(onToggle).toHaveBeenCalledWith(false);
  });

  it('shows off and turns on on click', () => {
    const { onToggle, button } = renderSwitch({ enabled: false });
    expect(button.getAttribute('aria-checked')).toBe('false');
    expect(screen.getByText('Claude cannot read or change Notiz')).toBeTruthy();
    fireEvent.click(button);
    expect(onToggle).toHaveBeenCalledWith(true);
  });

  it('is disabled while saving and shows save errors', () => {
    const { button } = renderSwitch({ isSaving: true, errorMessage: 'Server unreachable' });
    expect((button as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText('Server unreachable')).toBeTruthy();
  });
});
