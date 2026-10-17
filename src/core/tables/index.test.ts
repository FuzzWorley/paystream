import { describe, expect, it } from 'vitest';
import type { TaxTable } from '../types';
import { TABLE_2026 } from './2026';
import { TABLES, tableFor } from '.';

const table = (taxYear: number, confirmed: boolean): TaxTable => ({ ...TABLE_2026, taxYear, confirmed });

describe('tableFor', () => {
  const tables = [table(2026, true), table(2027, true), table(2028, false)];

  it('takes the newest confirmed table for the year or earlier', () => {
    expect(tableFor(2026, tables).taxYear).toBe(2026);
    expect(tableFor(2027, tables).taxYear).toBe(2027);
  });

  it('skips an unconfirmed draft and keeps showing last year', () => {
    expect(tableFor(2028, tables).taxYear).toBe(2027);
  });

  it('falls back to the oldest confirmed table for a year before any', () => {
    expect(tableFor(2020, tables).taxYear).toBe(2026);
  });

  it('refuses when nothing is confirmed', () => {
    expect(() => tableFor(2026, [table(2026, false)])).toThrow(/No confirmed tax table/);
  });
});

describe('the shipped tables', () => {
  // D8: users always see figures, so nothing ships without an owner-confirmed table. Every
  // deploy runs `npm run check`, so this test is the gate.
  it('include at least one the owner has confirmed', () => {
    expect(TABLES.some((t) => t.confirmed)).toBe(true);
  });

  it('start every bracket list at zero, rising', () => {
    for (const brackets of Object.values(TABLE_2026.brackets)) {
      expect(brackets[0]?.from).toBe(0);
      for (let i = 1; i < brackets.length; i++) {
        expect(brackets[i]?.from).toBeGreaterThan(brackets[i - 1]?.from ?? Infinity);
      }
    }
  });

  it('cite a source for every group of figures', () => {
    expect(TABLE_2026.sources.map((s) => s.what)).toHaveLength(4);
    for (const s of TABLE_2026.sources) expect(s.url).toMatch(/^https:\/\/www\.irs\.gov\//);
  });
});
