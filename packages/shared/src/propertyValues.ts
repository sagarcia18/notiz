import type { DatabaseProperty, PropertyOption, PropertyType } from './databases.js';
import type { PropertyValue } from './propertyValueSchema.js';

export const MAX_TEXT_VALUE_LENGTH = 10_000;

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
  return value === undefined || value === null || value === '';
}

function hasOption(options: PropertyOption[], id: string): boolean {
  return options.some((option) => option.id === id);
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
  }
}

function findOption(options: PropertyOption[], value: PropertyValue): PropertyOption | undefined {
  return typeof value === 'string' ? options.find((option) => option.id === value) : undefined;
}

/** The value as plain text, using option names for select and status. */
export function valueToText(
  property: Pick<DatabaseProperty, 'type' | 'options'>,
  value: PropertyValue | undefined,
): string {
  if (isEmptyValue(value)) {
    return '';
  }
  if (property.type === 'select' || property.type === 'status') {
    return findOption(property.options, value ?? null)?.name ?? '';
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

function convertToChoice(
  value: PropertyValue,
  from: Pick<DatabaseProperty, 'type' | 'options'>,
  options: PropertyOption[],
): PropertyValue {
  const sameIdKept = typeof value === 'string' && hasOption(options, value);
  if ((from.type === 'select' || from.type === 'status') && sameIdKept) {
    return value;
  }
  return textToOptionId(valueToText(from, value), options);
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
      converted = convertToChoice(value, from, to.options);
      break;
  }
  return isValidPropertyValue(to, converted) ? converted : null;
}
