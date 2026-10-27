// @vitest-environment jsdom
import type { DiagramLink } from '@notiz/shared';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it } from 'vitest';
import { LinkBadge } from './LinkBadge';

const databaseLink: DiagramLink = {
  elementId: 'DataStore_1',
  pageId: '00000000-0000-4000-8000-0000000000d1',
  state: 'ok',
  title: 'Devices',
  icon: null,
  status: null,
  rowCount: 12,
  description: 'Devices per floor',
};

function renderBadge(link: DiagramLink): HTMLElement {
  render(
    <MemoryRouter>
      <LinkBadge link={link} />
    </MemoryRouter>,
  );
  return screen.getByRole('link', { name: `Open ${link.title}` });
}

describe('LinkBadge', () => {
  afterEach(() => {
    cleanup();
  });

  it('shows a linked database with its row count and description tooltip', () => {
    const badge = renderBadge(databaseLink);
    expect(badge.textContent).toContain('▦ Devices · 12 rows');
    expect(badge.getAttribute('title')).toBe('Open Devices\nDevices per floor');
  });

  it('uses the singular and leaves out an empty description', () => {
    const badge = renderBadge({ ...databaseLink, rowCount: 1, description: '  ' });
    expect(badge.textContent).toContain('Devices · 1 row');
    expect(badge.getAttribute('title')).toBe('Open Devices');
  });

  it('shows the title of a normal page', () => {
    const badge = renderBadge({ ...databaseLink, rowCount: null, description: null });
    expect(badge.textContent).toContain('📄 Devices');
    expect(badge.textContent).not.toContain('rows');
  });
});
