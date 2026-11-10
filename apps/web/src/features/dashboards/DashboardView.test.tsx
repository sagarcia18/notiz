// @vitest-environment jsdom
import { type DashboardDetail, widgetConfigSchema } from '@notiz/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { installFakeMatchMedia } from '../../lib/fakeMatchMedia';
import { DashboardView } from './DashboardView';

const dashboardId = '00000000-0000-4000-8000-000000000001';

function widget(
  n: number,
  title: string,
  x: number,
  y: number,
): DashboardDetail['widgets'][number] {
  return {
    id: `00000000-0000-4000-8000-00000000001${n}`,
    dashboardId,
    config: widgetConfigSchema.parse({ type: 'kpi', title }),
    layout: { x, y, w: 6, h: 3 },
    createdAt: '',
  };
}

const detail: DashboardDetail = {
  id: dashboardId,
  widgets: [widget(1, 'Right', 6, 0), widget(2, 'Second row', 0, 3), widget(3, 'Left', 0, 0)],
};

function renderDashboard(): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn((url: string) =>
    Promise.resolve(
      new Response(
        url.endsWith(`/api/dashboards/${dashboardId}`)
          ? JSON.stringify(detail)
          : JSON.stringify({ state: 'unconfigured' }),
      ),
    ),
  );
  vi.stubGlobal('fetch', fetchMock);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <DashboardView dashboardId={dashboardId} />
    </QueryClientProvider>,
  );
  return fetchMock;
}

describe('DashboardView on phones', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('stacks widgets in reading order and never saves a layout', async () => {
    installFakeMatchMedia(375, true);
    const fetchMock = renderDashboard();

    const stack = await screen.findByTestId('dashboard-stack');
    const titles = (await within(stack).findAllByRole('heading', { level: 3 })).map(
      (heading) => heading.textContent,
    );
    expect(titles).toEqual(['Left', 'Right', 'Second row']);
    expect(document.querySelector('.react-grid-layout')).toBeNull();

    const methods = fetchMock.mock.calls.map(
      (call: unknown[]) => (call[1] as RequestInit | undefined)?.method ?? 'GET',
    );
    expect(methods.every((method: string) => method === 'GET')).toBe(true);
  });

  it('keeps the grid on wider screens', async () => {
    installFakeMatchMedia(1280);
    renderDashboard();
    await waitFor(() => expect(screen.queryByText('Loading…')).toBeNull());
    expect(screen.queryByTestId('dashboard-stack')).toBeNull();
  });
});
