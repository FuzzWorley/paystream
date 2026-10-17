// The seeded sweep over the core (paystream-frontend skill). Fixed seed: a failure reproduces.
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { earnedBetween, rateAt } from './stream';
import { annualBreakdown } from './tax';
import { TABLE_2026 } from './tables/2026';
import { FILING_STATUSES, STREAMS, TAXES, type Clock, type TaxInputs } from './types';

const SEED = 20261017;
const RUNS = 500;
const options = { seed: SEED, numRuns: RUNS };

const jan1 = new Date(2026, 0, 1).getTime();
const jan1Next = new Date(2027, 0, 1).getTime();

const taxInputs: fc.Arbitrary<TaxInputs> = fc.record({
  salary: fc.double({ min: 0, max: 3_000_000, noNaN: true }),
  filingStatus: fc.constantFrom(...FILING_STATUSES),
  stateRate: fc.double({ min: 0, max: 0.15, noNaN: true }),
  overrides: fc.constant({}),
});
const clock: fc.Arbitrary<Clock> = fc.oneof(
  fc.constant<Clock>({ kind: 'around' }),
  fc.record({
    kind: fc.constant('work' as const),
    hoursPerWeek: fc.integer({ min: 1, max: 80 }),
    weeksPerYear: fc.integer({ min: 1, max: 52 }),
  }),
);
// Instants from the start of 2026 into the first days of 2027, so spans cross New Year.
const instant = fc.integer({ min: jan1, max: jan1Next + 5 * 86_400_000 });

const close = (a: number, b: number, scale: number) => Math.abs(a - b) <= 1e-9 * Math.max(1, scale);

describe('core properties', () => {
  it('take-home plus every tax equals gross, at every instant and over any span', () => {
    fc.assert(
      fc.property(taxInputs, clock, instant, instant, (inp, clk, a, b) => {
        const [t0, t1] = a <= b ? [a, b] : [b, a];
        const rate = rateAt(inp, TABLE_2026, clk, t0);
        const gross = rate.you + TAXES.reduce((sum, t) => sum + rate[t], 0);
        const seconds = clk.kind === 'around' ? 365 * 86_400 : clk.hoursPerWeek * clk.weeksPerYear * 3600;
        expect(close(gross, inp.salary / seconds, inp.salary)).toBe(true);

        const span = earnedBetween(inp, TABLE_2026, clk, t0, t1);
        const total = STREAMS.reduce((sum, s) => sum + span[s], 0);
        expect(close(total, (inp.salary / seconds) * ((t1 - t0) / 1000), inp.salary * 10)).toBe(true);
      }),
      options,
    );
  });

  it('each stream integrated over the year equals its annual figure', () => {
    fc.assert(
      fc.property(taxInputs, (inp) => {
        const year = earnedBetween(inp, TABLE_2026, { kind: 'around' }, jan1, jan1Next);
        const annual = annualBreakdown(inp, TABLE_2026);
        for (const s of STREAMS) expect(close(year[s], annual[s], inp.salary)).toBe(true);
      }),
      options,
    );
  });

  it('raising salary never lowers a tax', () => {
    fc.assert(
      fc.property(taxInputs, fc.double({ min: 0, max: 500_000, noNaN: true }), (inp, raise) => {
        const lower = annualBreakdown(inp, TABLE_2026);
        const higher = annualBreakdown({ ...inp, salary: inp.salary + raise }, TABLE_2026);
        for (const t of TAXES) expect(higher[t]).toBeGreaterThanOrEqual(lower[t] - 1e-9);
      }),
      options,
    );
  });

  it('every amount is finite and never negative without typed rates', () => {
    fc.assert(
      fc.property(taxInputs, clock, instant, (inp, clk, t) => {
        const rate = rateAt(inp, TABLE_2026, clk, t);
        for (const s of STREAMS) {
          expect(Number.isFinite(rate[s])).toBe(true);
          expect(rate[s]).toBeGreaterThanOrEqual(0);
        }
      }),
      options,
    );
  });
});
