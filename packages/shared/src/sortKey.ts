/**
 * Fractional index keys: base-62 strings that sort with plain byte comparison
 * (SQLite BINARY collation), so an item can be placed between two siblings
 * without renumbering the others. Keys never end in the zero digit, which
 * guarantees there is always room for another key below them.
 */
const DIGITS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const ZERO = DIGITS.charAt(0);

function digitValue(char: string): number {
  const value = DIGITS.indexOf(char);
  if (value < 0) {
    throw new Error(`Invalid sort key digit "${char}"`);
  }
  return value;
}

function midpoint(a: string, b: string | null): string {
  if (b !== null) {
    let common = 0;
    while ((a.charAt(common) || ZERO) === b.charAt(common)) {
      common++;
    }
    if (common > 0) {
      return b.slice(0, common) + midpoint(a.slice(common), b.slice(common));
    }
  }
  const low = a === '' ? 0 : digitValue(a.charAt(0));
  const high = b === null ? DIGITS.length : digitValue(b.charAt(0));
  if (high - low > 1) {
    return DIGITS.charAt(Math.round((low + high) / 2));
  }
  if (b !== null && b.length > 1) {
    return b.charAt(0);
  }
  return DIGITS.charAt(low) + midpoint(a.slice(1), null);
}

function assertValidKey(key: string): void {
  if (key === '' || key.endsWith(ZERO)) {
    throw new Error(`Invalid sort key "${key}"`);
  }
  for (const char of key) {
    digitValue(char);
  }
}

/** Returns a key strictly between `before` and `after`; null means open-ended. */
export function sortKeyBetween(before: string | null, after: string | null): string {
  if (before !== null) assertValidKey(before);
  if (after !== null) assertValidKey(after);
  if (before !== null && after !== null && before >= after) {
    throw new Error(`Sort key "${before}" must be lower than "${after}"`);
  }
  return midpoint(before ?? '', after);
}
