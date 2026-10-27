import type { DatabaseProperty, PageTreeNode, WidgetConfig, WidgetMetric } from '@notiz/shared';

export interface DatabaseChoice {
  id: string;
  title: string;
}

/** Every database in the page tree, depth first. */
export function databaseChoices(nodes: PageTreeNode[]): DatabaseChoice[] {
  return nodes.flatMap((node) => [
    ...(node.kind === 'database' ? [{ id: node.id, title: node.title || 'Untitled' }] : []),
    ...databaseChoices(node.children),
  ]);
}

export function numberProperties(properties: DatabaseProperty[]): DatabaseProperty[] {
  return properties.filter((property) => property.type === 'number');
}

export function groupableProperties(properties: DatabaseProperty[]): DatabaseProperty[] {
  return properties.filter((property) => property.type === 'select' || property.type === 'status');
}

/** A new database invalidates the view and all property choices. */
export function withDatabase(config: WidgetConfig, databaseId: string | null): WidgetConfig {
  return {
    ...config,
    databaseId,
    viewId: null,
    metric: 'count',
    metricPropertyId: null,
    groupByPropertyId: null,
    groupByStatusGroup: false,
  };
}

/** Sum/average need a number property: keep the current one or take the first. */
export function withMetric(
  config: WidgetConfig,
  metric: WidgetMetric,
  properties: DatabaseProperty[],
): WidgetConfig {
  if (metric === 'count') {
    return { ...config, metric, metricPropertyId: null };
  }
  const numbers = numberProperties(properties);
  const current = numbers.find((property) => property.id === config.metricPropertyId);
  return { ...config, metric, metricPropertyId: (current ?? numbers[0])?.id ?? null };
}

export function withGroupBy(
  config: WidgetConfig,
  propertyId: string | null,
  properties: DatabaseProperty[],
): WidgetConfig {
  const property = properties.find((candidate) => candidate.id === propertyId);
  return {
    ...config,
    groupByPropertyId: property?.id ?? null,
    groupByStatusGroup: property?.type === 'status' && config.groupByStatusGroup,
  };
}

/** The server rejects sum/average without a number property. */
export function canSave(config: WidgetConfig): boolean {
  return config.metric === 'count' || config.metricPropertyId !== null;
}

const numberFormat = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });

export function formatValue(value: number | null): string {
  return value === null ? '–' : numberFormat.format(value);
}
