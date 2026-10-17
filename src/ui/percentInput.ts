/**
 * Keeps digits and one decimal point as the user types, and returns the percent typed, capped
 * at `max`; null when the field is empty.
 */
export function readPercent(el: HTMLInputElement, max: number): number | null {
  const cleaned = el.value.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1');
  if (cleaned !== el.value) el.value = cleaned;
  const percent = Number.parseFloat(cleaned);
  return Number.isFinite(percent) ? Math.min(percent, max) : null;
}

/** "5.75" for a rate of 0.0575: a fraction shown in a percent field, without the sign. */
export function percentText(fraction: number): string {
  return String(Number((fraction * 100).toFixed(2)));
}
