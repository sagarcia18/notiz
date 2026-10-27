// @vitest-environment jsdom
import { type DashboardWidget, type WidgetData, widgetConfigSchema } from '@notiz/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { WidgetBody } from './WidgetBody';

const databaseId = '00000000-0000-4000-8000-000000000001';

function widget(config: object): DashboardWidget {
  return {
    id: '00000000-0000-4000-8000-000000000002',
    dashboardId: '00000000-0000-4000-8000-000000000003',
    config: widgetConfigSchema.parse(config),
    layout: { x: 0, y: 0, w: 3, h: 3 },
    createdAt: '',
  };
}

function renderWith(data: WidgetData, shown: DashboardWidget): void {
  const fetchMock = vi.fn(() => Promise.resolve(new Response(JSON.stringify(data))));
  vi.stubGlobal('fetch', fetchMock);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <WidgetBody widget={shown} />
    </QueryClientProvider>,
  );
}

describe('WidgetBody', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('shows the formatted KPI value with its metric', async () => {
    renderWith(
      { state: 'ok', total: 1234.5, buckets: [] },
      widget({ type: 'kpi', databaseId, metric: 'sum', metricPropertyId: databaseId }),
    );
    expect(await screen.findByText('sum')).toBeTruthy();
    expect(screen.getByText(new Intl.NumberFormat().format(1234.5))).toBeTruthy();
  });

  it('asks for a database and grouping when unconfigured', async () => {
    renderWith({ state: 'unconfigured', total: null, buckets: [] }, widget({ type: 'bar' }));
    expect(await screen.findByText(/Choose a database and a grouping/)).toBeTruthy();
  });

  it('explains a missing source', async () => {
    renderWith(
      { state: 'source_missing', total: null, buckets: [] },
      widget({ type: 'kpi', databaseId }),
    );
    expect(await screen.findByText(/is gone/)).toBeTruthy();
  });

  it('does not draw an empty pie', async () => {
    renderWith(
      { state: 'ok', total: 0, buckets: [{ key: 'a', label: 'A', color: 'red', value: 0 }] },
      widget({ type: 'pie', databaseId, groupByPropertyId: databaseId }),
    );
    expect(await screen.findByText('Nothing to show yet.')).toBeTruthy();
  });
});
