// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { createMemoryRouter, Link, RouterProvider } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { installFakeMatchMedia } from '../lib/fakeMatchMedia';
import { AppLayout } from './AppLayout';

vi.mock('../features/pages/SidebarPages', () => ({
  SidebarPages: (): ReactElement => <Link to="/pages/p1">First page</Link>,
}));
vi.mock('../features/search/SearchCommand', () => ({ SearchCommand: () => null }));
vi.mock('../features/import/NotionImport', () => ({ NotionImport: () => null }));
vi.mock('../features/settings/McpAccess', () => ({ McpAccess: () => null }));

function renderLayout(): void {
  const router = createMemoryRouter(
    [
      {
        path: '/',
        element: <AppLayout />,
        children: [
          { index: true, element: <p>Home</p> },
          { path: 'pages/:pageId', element: <p>Page view</p> },
        ],
      },
    ],
    { initialEntries: ['/'] },
  );
  render(<RouterProvider router={router} />);
}

function sidebar(): HTMLElement {
  const element = document.getElementById('sidebar');
  if (!element) throw new Error('sidebar missing');
  return element;
}

const isHidden = (): boolean => sidebar().hasAttribute('inert');
const openButton = (): HTMLElement => screen.getByRole('button', { name: 'Open sidebar' });

describe('AppLayout sidebar drawer', () => {
  afterEach(cleanup);

  it('keeps the sidebar visible on desktop', () => {
    installFakeMatchMedia(1280);
    renderLayout();
    expect(isHidden()).toBe(false);
    expect(screen.queryByTestId('sidebar-overlay')).toBeNull();
  });

  it('opens on phones from the menu button and closes on Esc and on the overlay', () => {
    installFakeMatchMedia(375, true);
    renderLayout();
    expect(isHidden()).toBe(true);

    fireEvent.click(openButton());
    expect(isHidden()).toBe(false);
    expect(
      screen.getByRole('button', { name: 'Close sidebar' }).getAttribute('aria-expanded'),
    ).toBe('true');

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(isHidden()).toBe(true);

    fireEvent.click(openButton());
    fireEvent.click(screen.getByTestId('sidebar-overlay'));
    expect(isHidden()).toBe(true);
  });

  it('closes after navigating from the drawer', async () => {
    installFakeMatchMedia(375, true);
    renderLayout();
    fireEvent.click(openButton());

    fireEvent.click(screen.getByRole('link', { name: 'First page' }));
    expect(await screen.findByText('Page view')).toBeTruthy();
    expect(isHidden()).toBe(true);
  });

  it('becomes a drawer when a desktop window shrinks to tablet width', () => {
    const fake = installFakeMatchMedia(1280);
    renderLayout();
    act(() => fake.resize(900));
    expect(isHidden()).toBe(true);
    fireEvent.click(openButton());
    expect(isHidden()).toBe(false);
  });
});
