import {
  type DatabaseProperty,
  type PropertyOption,
  type PropertyType,
  hasOptions,
} from './databases.js';
import type { PropertyValue } from './propertyValueSchema.js';

export const MAX_TEXT_VALUE_LENGTH = 10_000;

/** Multi-select values are written as option names joined by this separator. */
export const MULTI_VALUE_SEPARATOR = ', ';

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

/** True for a real calendar day written as `YYYY-MM-DD`. */
export function isDateValue(value: string): boolean {
  if (!datePattern.test(value)) {
    return false;
  }
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

export function isEmptyValue(value: PropertyValue | undefined): boolean {
  return (
    value === undefined ||
    value === null ||
    value === '' ||
    (Array.isArray(value) && value.length === 0)
  );
}

function hasOption(options: PropertyOption[], id: string): boolean {
  return options.some((option) => option.id === id);
}

function isValidOptionList(options: PropertyOption[], value: PropertyValue): boolean {
  return (
    Array.isArray(value) &&
    new Set(value).size === value.length &&
    value.every((id) => hasOption(options, id))
  );
}

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Unique row ids; whether they are rows of the target database is checked by the server. */
function isValidRowIdList(value: PropertyValue): boolean {
  return (
    Array.isArray(value) &&
    new Set(value).size === value.length &&
    value.every((id) => uuidPattern.test(id))
  );
}

/** Whether `value` may be stored for the property. `null` (clear) is always valid. */
export function isValidPropertyValue(
  property: Pick<DatabaseProperty, 'type' | 'options'>,
  value: PropertyValue,
): boolean {
  if (value === null) {
    return true;
  }
  switch (property.type) {
    case 'title':
    case 'text':
    case 'url':
      return typeof value === 'string' && value.length <= MAX_TEXT_VALUE_LENGTH;
    case 'number':
      return typeof value === 'number' && Number.isFinite(value);
    case 'checkbox':
      return typeof value === 'boolean';
    case 'date':
      return typeof value === 'string' && isDateValue(value);
    case 'select':
    case 'status':
      return typeof value === 'string' && hasOption(property.options, value);
    case 'multi_select':
      return isValidOptionList(property.options, value);
    case 'relation':
      return isValidRowIdList(value);
  }
}

/** The option ids of a value: one for select/status, any number for multi_select. */
export function optionIdsOf(value: PropertyValue | undefined): string[] {
  if (Array.isArray(value)) {
    return value;
  }
  return typeof value === 'string' && value !== '' ? [value] : [];
}

function optionNames(options: PropertyOption[], value: PropertyValue | undefined): string[] {
  return optionIdsOf(value).flatMap((id) => {
    const option = options.find((candidate) => candidate.id === id);
    return option ? [option.name] : [];
  });
}

/** The value as plain text, using option names for select, multi-select and status. */
export function valueToText(
  property: Pick<DatabaseProperty, 'type' | 'options'>,
  value: PropertyValue | undefined,
): string {
  if (isEmptyValue(value)) {
    return '';
  }
  if (property.type === 'select' || property.type === 'status') {
    return optionNames(property.options, value)[0] ?? '';
  }
  if (property.type === 'multi_select') {
    return optionNames(property.options, value).join(MULTI_VALUE_SEPARATOR);
  }
  // Relation values are row ids; their titles live in another database.
  if (property.type === 'relation') {
    return '';
  }
  return String(value);
}

function textToNumber(text: string): number | null {
  const parsed = Number(text.trim());
  return text.trim() !== '' && Number.isFinite(parsed) ? parsed : null;
}

function textToOptionId(text: string, options: PropertyOption[]): string | null {
  const name = text.trim().toLowerCase();
  return options.find((option) => option.name.toLowerCase() === name)?.id ?? null;
}

function keptOptionIds(
  value: PropertyValue,
  from: Pick<DatabaseProperty, 'type' | 'options'>,
  options: PropertyOption[],
): string[] {
  return hasOptions(from.type) ? optionIdsOf(value).filter((id) => hasOption(options, id)) : [];
}

/** Option names of the value (or comma-separated parts of its text) looked up in `options`. */
function namesToOptionIds(
  value: PropertyValue,
  from: Pick<DatabaseProperty, 'type' | 'options'>,
  options: PropertyOption[],
): string[] {
  const names =
    from.type === 'multi_select'
      ? optionNames(from.options, value)
      : valueToText(from, value).split(',');
  const ids = names.flatMap((name) => {
    const id = textToOptionId(name, options);
    return id ? [id] : [];
  });
  return [...new Set(ids)];
}

/**
 * Converts a stored value when a property changes type or options.
 * Returns null when the value has no sensible equivalent.
 */
export function convertPropertyValue(
  value: PropertyValue,
  from: Pick<DatabaseProperty, 'type' | 'options'>,
  to: { type: PropertyType; options: PropertyOption[] },
): PropertyValue {
  if (isEmptyValue(value)) {
    return null;
  }
  // Row ids only mean something for the same target; the service clears them when it changes.
  if (from.type === 'relation' || to.type === 'relation') {
    return from.type === to.type ? value : null;
  }
  const text = valueToText(from, value);
  let converted: PropertyValue;
  switch (to.type) {
    case 'title':
    case 'text':
    case 'url':
      converted = text;
      break;
    case 'number':
      converted = typeof value === 'number' ? value : textToNumber(text);
      break;
    case 'checkbox':
      converted = typeof value === 'boolean' ? value : null;
      break;
    case 'date':
      converted = isDateValue(text) ? text : null;
      break;
    case 'select':
    case 'status':
      converted =
        keptOptionIds(value, from, to.options)[0] ??
        (from.type === 'multi_select'
          ? (namesToOptionIds(value, from, to.options)[0] ?? null)
          : textToOptionId(text, to.options));
      break;
    case 'multi_select': {
      const kept = keptOptionIds(value, from, to.options);
      const ids = kept.length > 0 ? kept : namesToOptionIds(value, from, to.options);
      converted = ids.length > 0 ? ids : null;
      break;
    }
  }
  return isValidPropertyValue(to, converted) ? converted : null;
}
