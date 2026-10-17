import type { TaxTable } from '../types';
import { TABLE_2026 } from './2026';

/** Every shipped table, oldest first. A new year's draft can sit here unconfirmed (D8). */
export const TABLES: readonly TaxTable[] = [TABLE_2026];

/**
 * The newest confirmed table for `year` or earlier, else the oldest confirmed one (a clock
 * set before our first table). The UI labels which year it is.
 */
export function tableFor(year: number, tables: readonly TaxTable[] = TABLES): TaxTable {
  const confirmed = tables.filter((t) => t.confirmed);
  const first = confirmed[0];
  // Nothing deploys without a confirmed table (D8), so only an unconfirmed dev tree lands here.
  if (!first) throw new Error('No confirmed tax table (ENGINEERING_SPEC §7).');
  return confirmed.findLast((t) => t.taxYear <= year) ?? first;
}
