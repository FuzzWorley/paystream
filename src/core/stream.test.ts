import { describe, expect, it } from 'vitest';
import { annualBreakdown } from './tax';
import { TABLE_2026 } from './tables/2026';
import {
  calendarYear,
  earnedBetween,
  earningSeconds,
  nextCoinIn,
  rateAt,
  socialSecurityStops,
} from './stream';
import { STREAMS, type Clock, type TaxInputs } from './types';

const AROUND: Clock = { kind: 'around' };
const WORK: Clock = { kind: 'work', hoursPerWeek: 40, weeksPerYear: 52 };
const YEAR_2026 = 365 * 86_400;
const jan1 = new Date(2026, 0, 1).getTime();
const jan1Next = new Date(2027, 0, 1).getTime();
const at = (fraction: number) => jan1 + fraction * (jan1Next - jan1);

const inputs = (over: Partial<TaxInputs> = {}): TaxInputs => ({
  salary: 75_000,
  filingStatus: 'single',
  stateRate: 0.05,
  overrides: {},
  ...over,
});

describe('calendar', () => {
  it('uses the local year (tests run in America/Chicago)', () => {
    const y = calendarYear(new Date('2026-07-04T12:00:00Z').getTime());
    expect(y.year).toBe(2026);
    expect(new Date(y.start).toISOString()).toBe('2026-01-01T06:00:00.000Z');
    expect((y.end - y.start) / 1000).toBe(YEAR_2026);
  });

  it('counts a leap year and a working year', () => {
    expect(earningSeconds(AROUND, calendarYear(new Date(2028, 5, 1).getTime()))).toBe(366 * 86_400);
    expect(earningSeconds(WORK, calendarYear(jan1))).toBe(40 * 52 * 3600);
  });
});

describe('rateAt', () => {
  it('flows the $75k example at its annual figures per second', () => {
    const rate = rateAt(inputs(), TABLE_2026, AROUND, at(0.3));
    expect(rate.you * YEAR_2026).toBeCloseTo(57_842.5, 6);
    expect(rate.federal * YEAR_2026).toBeCloseTo(7_670, 6);
    // A penny every 5.45 s to you, around the clock.
    expect(0.01 / rate.you).toBeCloseTo(5.452, 3);
  });

  it('flows faster on the work clock: the same year in fewer seconds', () => {
    const rate = rateAt(inputs(), TABLE_2026, WORK, at(0.3));
    expect(rate.you * 40 * 52 * 3600).toBeCloseTo(57_842.5, 6);
  });

  it('stops Social Security once wages to date reach the wage base, and take-home speeds up', () => {
    const salary = 2 * 184_500; // reaches the base exactly halfway through the year
    const before = rateAt(inputs({ salary }), TABLE_2026, AROUND, at(0.4999));
    const after = rateAt(inputs({ salary }), TABLE_2026, AROUND, at(0.5001));
    expect(before.socialSecurity).toBeCloseTo((0.062 * salary) / YEAR_2026, 12);
    expect(after.socialSecurity).toBe(0);
    expect(after.you - before.you).toBeCloseTo(before.socialSecurity, 12);
  });

  it('starts Additional Medicare at its threshold', () => {
    const salary = 400_000; // single threshold of 200,000 reached halfway
    const gross = salary / YEAR_2026;
    expect(rateAt(inputs({ salary }), TABLE_2026, AROUND, at(0.49)).medicare).toBeCloseTo(0.0145 * gross, 12);
    expect(rateAt(inputs({ salary }), TABLE_2026, AROUND, at(0.51)).medicare).toBeCloseTo(0.0235 * gross, 12);
  });

  it('flows a typed Social Security or Medicare rate evenly all year', () => {
    const over = inputs({ salary: 400_000, overrides: { socialSecurity: 0.05, medicare: 0.02 } });
    const late = rateAt(over, TABLE_2026, AROUND, at(0.9));
    expect(late.socialSecurity * YEAR_2026).toBeCloseTo(20_000, 6);
    expect(late.medicare * YEAR_2026).toBeCloseTo(8_000, 6);
  });
});

describe('earnedBetween', () => {
  it('adds up to each annual figure over the year, across both thresholds', () => {
    const big = inputs({ salary: 250_000, filingStatus: 'single' });
    const year = earnedBetween(big, TABLE_2026, AROUND, jan1, jan1Next);
    const annual = annualBreakdown(big, TABLE_2026);
    for (const s of STREAMS) expect(year[s]).toBeCloseTo(annual[s], 6);
  });

  it('starts Social Security again on 1 January', () => {
    const salary = 2 * 184_500;
    const hour = 3_600_000;
    const span = earnedBetween(inputs({ salary }), TABLE_2026, AROUND, jan1Next - hour, jan1Next + hour);
    const perHour = (0.062 * salary * 3600) / YEAR_2026;
    expect(span.socialSecurity).toBeCloseTo(perHour, 9); // the new year's hour only
  });

  it('is zero over no time', () => {
    expect(earnedBetween(inputs(), TABLE_2026, AROUND, at(0.5), at(0.5)).you).toBe(0);
  });
});

describe('nextCoinIn', () => {
  it('counts down to the next whole coin', () => {
    expect(nextCoinIn(0.004, 0.001, 0.01)).toBeCloseTo(6, 9);
    expect(nextCoinIn(0.02, 0.001, 0.01)).toBeCloseTo(10, 9);
  });

  it('never arrives on a stopped stream', () => {
    expect(nextCoinIn(1, 0, 0.01)).toBe(Infinity);
  });
});

describe('socialSecurityStops', () => {
  it('is the instant wages to date reach the wage base', () => {
    const stops = socialSecurityStops(inputs({ salary: 2 * 184_500 }), TABLE_2026, at(0.2));
    expect(stops).toBeCloseTo(at(0.5), -1);
  });

  it('is null under the wage base or with a typed rate', () => {
    expect(socialSecurityStops(inputs({ salary: 184_500 }), TABLE_2026, at(0.2))).toBeNull();
    const typed = inputs({ salary: 500_000, overrides: { socialSecurity: 0.062 } });
    expect(socialSecurityStops(typed, TABLE_2026, at(0.2))).toBeNull();
  });
});
