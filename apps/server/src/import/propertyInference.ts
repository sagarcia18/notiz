import {
  type OptionColor,
  type PropertyOptionInput,
  type PropertyType,
  type PropertyValue,
  type StatusGroup,
  MAX_TEXT_VALUE_LENGTH,
  isDateValue,
} from '@notiz/shared';

/** Notion relations are imported as text, so imports never create relation properties. */
export type ImportedType = Exclude<PropertyType, 'title' | 'relation'>;

/** How one CSV column is imported; `skip` columns are left out. */
export interface InferredColumn {
  name: string;
  type: ImportedType | 'skip';
  options: PropertyOptionInput[];
  /** Why the column was skipped or simplified, shown as an import warning. */
  note: string | null;
}

const personColumn =
  /^(assignee|assignees|assigned to|owner|owners|person|people|created by|last edited by|responsible)$/i;
const relationSuffix = /\s*\((?:[^()]*\.(?:md|csv)|https?:\/\/(?:www\.)?notion\.so\/[^()]*)\)/gi;
const numberPattern = /^-?[$€£¥]?\s?(\d{1,3}(,\d{3})+|\d+)(\.\d+)?\s?%?$/;
const urlPattern = /^https?:\/\/\S+$/i;
const months = [
  'jan',
  'feb',
  'mar',
  'apr',
  'may',
  'jun',
  'jul',
  'aug',
  'sep',
  'oct',
  'nov',
  'dec',
] as const;
const palette: OptionColor[] = [
  'blue',
  'green',
  'orange',
  'purple',
  'pink',
  'yellow',
  'red',
  'brown',
  'gray',
];
const groupColors: Record<StatusGroup, OptionColor> = {
  todo: 'gray',
  in_progress: 'blue',
  complete: 'green',
};

const MAX_OPTIONS = 200;
const MAX_CHOICES = 25;
const MAX_OPTION_LENGTH = 60;

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function validDay(year: number, month: number, day: number): string | null {
  const value = `${year}-${pad(month)}-${pad(day)}`;
  return isDateValue(value) ? value : null;
}

/** Notion dates ("October 27, 2026", "2026/10/27", "10/27/2026", with time or a range) as `YYYY-MM-DD`. */
export function parseNotionDate(text: string): string | null {
  const start = (text.split('→')[0] ?? '').trim();
  const iso = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})\b/.exec(start);
  if (iso) return validDay(Number(iso[1]), Number(iso[2]), Number(iso[3]));
  const named = /^([A-Za-z]{3,9})\.?\s+(\d{1,2}),?\s+(\d{4})\b/.exec(start);
  if (named?.[1]) {
    const month = months.indexOf(named[1].slice(0, 3).toLowerCase() as (typeof months)[number]);
    return month < 0 ? null : validDay(Number(named[3]), month + 1, Number(named[2]));
  }
  const us = /^(\d{1,2})\/(\d{1,2})\/(\d{4})\b/.exec(start);
  if (us) return validDay(Number(us[3]), Number(us[1]), Number(us[2]));
  return null;
}

export function parseNotionNumber(text: string): number | null {
  const trimmed = text.trim();
  if (!numberPattern.test(trimmed)) return null;
  const parsed = Number(trimmed.replace(/[$€£¥,%\s]/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
}

/** Relation cells list the linked pages as `Title (path.md)`; keeps the titles. */
export function stripRelationLinks(text: string): string {
  return text.replace(relationSuffix, '').trim();
}

export function splitMulti(text: string): string[] {
  return text
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part !== '');
}

/** Status group guessed from an option name. */
export function guessStatusGroup(name: string): StatusGroup {
  if (/\b(done|complete[d]?|finished|closed|resolved|shipped|archived)\b/i.test(name)) {
    return 'complete';
  }
  if (/\b(not started|to ?do|backlog|open|planned|new|idea)\b/i.test(name)) return 'todo';
  if (/\b(progress|doing|started|active|review|blocked|wip|testing)\b/i.test(name)) {
    return 'in_progress';
  }
  return 'todo';
}

function distinct(values: string[]): string[] {
  return [...new Set(values)];
}

function choiceOptions(names: string[]): PropertyOptionInput[] {
  return names.slice(0, MAX_OPTIONS).map((name, index) => ({
    name: name.slice(0, 100),
    color: palette[index % palette.length] ?? 'gray',
  }));
}

function statusOptions(names: string[]): PropertyOptionInput[] {
  const order: StatusGroup[] = ['todo', 'in_progress', 'complete'];
  return names
    .map((name) => ({ name: name.slice(0, 100), group: guessStatusGroup(name) }))
    .sort((a, b) => order.indexOf(a.group) - order.indexOf(b.group))
    .map(({ name, group }) => ({ name, group, color: groupColors[group] }));
}

function isChoiceLike(values: string[]): boolean {
  const names = distinct(values);
  return names.length <= MAX_CHOICES && names.every((name) => name.length <= MAX_OPTION_LENGTH);
}

function looksMulti(values: string[]): boolean {
  if (!values.some((value) => value.includes(','))) return false;
  const parts = values.flatMap(splitMulti);
  const names = distinct(parts);
  return (
    names.length < parts.length &&
    names.length <= MAX_OPTIONS &&
    names.every((name) => name.length <= 40)
  );
}

function column(
  name: string,
  type: InferredColumn['type'],
  options: PropertyOptionInput[] = [],
  note: string | null = null,
): InferredColumn {
  return { name, type, options, note };
}

/** Picks a Notiz type for a CSV column from its name and values. */
export function inferColumn(name: string, rawValues: string[]): InferredColumn {
  if (personColumn.test(name.trim())) {
    return column(name, 'skip', [], `Skipped person property "${name}"`);
  }
  const values = rawValues.map((value) => value.trim()).filter((value) => value !== '');
  if (values.length === 0) return column(name, 'text');
  if (values.some((value) => stripRelationLinks(value) !== value)) {
    return column(name, 'text', [], `Relation "${name}" imported as text with the page titles`);
  }
  if (values.every((value) => value === 'Yes' || value === 'No')) return column(name, 'checkbox');
  if (values.every((value) => parseNotionNumber(value) !== null)) return column(name, 'number');
  if (values.every((value) => parseNotionDate(value) !== null)) return column(name, 'date');
  if (values.every((value) => urlPattern.test(value))) return column(name, 'url');
  if (/^status$/i.test(name.trim()) && isChoiceLike(values)) {
    return column(name, 'status', statusOptions(distinct(values)));
  }
  if (looksMulti(values)) {
    return column(name, 'multi_select', choiceOptions(distinct(values.flatMap(splitMulti))));
  }
  if (values.length >= 2 && isChoiceLike(values) && distinct(values).length < values.length) {
    return column(name, 'select', choiceOptions(distinct(values)));
  }
  return column(name, 'text');
}

/** The stored value of one CSV cell; `optionIds` maps option names to ids. */
export function cellToValue(
  type: ImportedType,
  text: string,
  optionIds: ReadonlyMap<string, string>,
): PropertyValue {
  const trimmed = text.trim();
  if (trimmed === '') return null;
  switch (type) {
    case 'text':
      return stripRelationLinks(trimmed).slice(0, MAX_TEXT_VALUE_LENGTH);
    case 'url':
      return trimmed.slice(0, MAX_TEXT_VALUE_LENGTH);
    case 'number':
      return parseNotionNumber(trimmed);
    case 'checkbox':
      return trimmed === 'Yes';
    case 'date':
      return parseNotionDate(trimmed);
    case 'select':
    case 'status':
      return optionIds.get(trimmed.slice(0, 100)) ?? null;
    case 'multi_select': {
      const ids = distinct(
        splitMulti(trimmed).flatMap((part) => optionIds.get(part.slice(0, 100)) ?? []),
      );
      return ids.length > 0 ? ids : null;
    }
  }
}
