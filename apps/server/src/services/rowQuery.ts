import {
  type DatabaseProperty,
  type DatabaseRow,
  type PropertyValue,
  type ViewFilter,
  type ViewSort,
  isEmptyValue,
  operatorsByType,
} from '@notiz/shared';

type PropertyMap = ReadonlyMap<string, DatabaseProperty>;

function valueOf(row: DatabaseRow, property: DatabaseProperty): PropertyValue {
  if (property.type === 'title') {
    return row.title;
  }
  return row.properties[property.id] ?? null;
}

function compareTo(value: PropertyValue, target: string | number | undefined): number | null {
  if (typeof value === 'number' && typeof target === 'number') {
    return value - target;
  }
  if (typeof value === 'string' && typeof target === 'string') {
    return value < target ? -1 : value > target ? 1 : 0;
  }
  return null;
}

function textMatches(value: PropertyValue, target: string | number | undefined): boolean {
  const needle = String(target ?? '').toLowerCase();
  return String(value ?? '')
    .toLowerCase()
    .includes(needle);
}

const caseInsensitiveTypes = new Set(['title', 'text', 'url']);

function isEqual(property: DatabaseProperty, value: PropertyValue, target: unknown): boolean {
  if (
    caseInsensitiveTypes.has(property.type) &&
    typeof value === 'string' &&
    typeof target === 'string'
  ) {
    return value.toLowerCase() === target.toLowerCase();
  }
  return value === target;
}

function optionGroup(property: DatabaseProperty, value: PropertyValue): string | undefined {
  return property.options.find((option) => option.id === value)?.group;
}

function matchesFilter(row: DatabaseRow, property: DatabaseProperty, filter: ViewFilter): boolean {
  const value = valueOf(row, property);
  const comparison = (): number | null =>
    isEmptyValue(value) ? null : compareTo(value, filter.value);
  switch (filter.operator) {
    case 'equals':
      return isEqual(property, value, filter.value);
    case 'not_equals':
      return !isEqual(property, value, filter.value);
    case 'contains':
      return textMatches(value, filter.value);
    case 'not_contains':
      return !textMatches(value, filter.value);
    case 'gt':
      return (comparison() ?? 0) > 0;
    case 'gte':
      return (comparison() ?? -1) >= 0;
    case 'lt':
      return (comparison() ?? 0) < 0;
    case 'lte':
      return (comparison() ?? 1) <= 0;
    case 'is_empty':
      return isEmptyValue(value);
    case 'is_not_empty':
      return !isEmptyValue(value);
    case 'is_checked':
      return value === true;
    case 'is_not_checked':
      return value !== true;
    case 'in_group':
      return optionGroup(property, value) === filter.value;
  }
}

/** Keeps rows matching every filter; filters on unknown properties or with unfit operators are skipped. */
export function filterRows(
  rows: DatabaseRow[],
  properties: PropertyMap,
  filters: ViewFilter[],
): DatabaseRow[] {
  const active = filters.flatMap((filter) => {
    const property = properties.get(filter.propertyId);
    const fits = property && operatorsByType[property.type].includes(filter.operator);
    return fits ? [{ filter, property }] : [];
  });
  return rows.filter((row) =>
    active.every(({ filter, property }) => matchesFilter(row, property, filter)),
  );
}

function sortRank(property: DatabaseProperty, value: PropertyValue): string | number | boolean {
  if (property.type === 'select' || property.type === 'status') {
    return property.options.findIndex((option) => option.id === value);
  }
  if (typeof value === 'string') {
    return value.toLocaleLowerCase();
  }
  return value ?? '';
}

function compareValues(property: DatabaseProperty, a: PropertyValue, b: PropertyValue): number {
  const rankA = sortRank(property, a);
  const rankB = sortRank(property, b);
  if (typeof rankA === 'string' && typeof rankB === 'string') {
    return rankA.localeCompare(rankB);
  }
  return Number(rankA) - Number(rankB);
}

/** Sorts by each sort in turn; empty values always go last; ties keep the manual order. */
export function sortRows(
  rows: DatabaseRow[],
  properties: PropertyMap,
  sorts: ViewSort[],
): DatabaseRow[] {
  const active = sorts.flatMap((sort) => {
    const property = properties.get(sort.propertyId);
    return property ? [{ property, factor: sort.direction === 'asc' ? 1 : -1 }] : [];
  });
  return [...rows].sort((a, b) => {
    for (const { property, factor } of active) {
      const valueA = valueOf(a, property);
      const valueB = valueOf(b, property);
      const emptyA = isEmptyValue(valueA);
      const emptyB = isEmptyValue(valueB);
      if (emptyA || emptyB) {
        if (emptyA !== emptyB) return emptyA ? 1 : -1;
        continue;
      }
      const result = compareValues(property, valueA, valueB) * factor;
      if (result !== 0) return result;
    }
    return a.sortOrder < b.sortOrder ? -1 : a.sortOrder > b.sortOrder ? 1 : 0;
  });
}
