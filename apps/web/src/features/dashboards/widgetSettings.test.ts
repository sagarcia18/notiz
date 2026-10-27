import { type DatabaseProperty, type PageTreeNode, widgetConfigSchema } from '@notiz/shared';
import { describe, expect, it } from 'vitest';
import { canSave, databaseChoices, withDatabase, withGroupBy, withMetric } from './widgetSettings';

const databaseId = '00000000-0000-4000-8000-000000000001';
const ids = {
  title: '00000000-0000-4000-8000-000000000010',
  points: '00000000-0000-4000-8000-000000000011',
  hours: '00000000-0000-4000-8000-000000000012',
  status: '00000000-0000-4000-8000-000000000013',
  tag: '00000000-0000-4000-8000-000000000014',
};

function property(id: string, type: DatabaseProperty['type']): DatabaseProperty {
  return {
    id,
    databaseId,
    name: type,
    type,
    options: [],
    relationDatabaseId: null,
    sortOrder: 'a0',
  };
}

const properties = [
  property(ids.title, 'title'),
  property(ids.points, 'number'),
  property(ids.hours, 'number'),
  property(ids.status, 'status'),
  property(ids.tag, 'select'),
];

function node(id: string, kind: PageTreeNode['kind'], children: PageTreeNode[] = []): PageTreeNode {
  return { id, parentId: null, kind, title: id, icon: null, sortOrder: 'a0', children };
}

describe('widget settings', () => {
  it('lists databases anywhere in the tree', () => {
    const tree = [node('doc', 'doc', [node('tasks', 'database')]), node('crm', 'database')];
    expect(databaseChoices(tree).map((choice) => choice.id)).toEqual(['tasks', 'crm']);
  });

  it('resets view and properties when the database changes', () => {
    const config = widgetConfigSchema.parse({
      type: 'bar',
      title: 'Kept',
      databaseId,
      metric: 'sum',
      metricPropertyId: ids.points,
      groupByPropertyId: ids.status,
      groupByStatusGroup: true,
    });
    expect(withDatabase(config, null)).toEqual(
      widgetConfigSchema.parse({ type: 'bar', title: 'Kept' }),
    );
  });

  it('picks a number property for sum and average', () => {
    const config = widgetConfigSchema.parse({ type: 'kpi', databaseId });
    const sum = withMetric(config, 'sum', properties);
    expect(sum.metricPropertyId).toBe(ids.points);
    const avg = withMetric({ ...sum, metricPropertyId: ids.hours }, 'avg', properties);
    expect(avg.metricPropertyId).toBe(ids.hours);
    expect(withMetric(sum, 'count', properties).metricPropertyId).toBeNull();
    expect(canSave(withMetric(config, 'sum', [property(ids.title, 'title')]))).toBe(false);
  });

  it('keeps status grouping only for status properties', () => {
    const config = widgetConfigSchema.parse({
      type: 'pie',
      databaseId,
      groupByPropertyId: ids.status,
      groupByStatusGroup: true,
    });
    expect(withGroupBy(config, ids.status, properties).groupByStatusGroup).toBe(true);
    expect(withGroupBy(config, ids.tag, properties)).toMatchObject({
      groupByPropertyId: ids.tag,
      groupByStatusGroup: false,
    });
  });
});
