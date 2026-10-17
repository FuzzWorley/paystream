import { describe, expect, it } from 'vitest';
import { cadence, TIME_UNITS, timeToEarn, unitSeconds } from './cadence';

const AROUND = { kind: 'around' } as const;
const WORK = { kind: 'work', hoursPerWeek: 40, weeksPerYear: 52 } as const;
const YEAR = 365 * 86_400;
const WORK_YEAR = 40 * 52 * 3600;

describe('unitSeconds', () => {
  it('is plain clock time around the clock, a month a twelfth of the year', () => {
    expect(TIME_UNITS.map((u) => unitSeconds(u, AROUND, YEAR))).toEqual([
      1,
      60,
      3600,
      86_400,
      7 * 86_400,
      YEAR / 12,
      YEAR,
    ]);
  });

  it('counts working time on the work clock: a workday, a working week', () => {
    expect(TIME_UNITS.map((u) => unitSeconds(u, WORK, WORK_YEAR))).toEqual([
      1,
      60,
      3600,
      8 * 3600,
      40 * 3600,
      WORK_YEAR / 12,
      WORK_YEAR,
    ]);
  });
});

describe('cadence', () => {
  it('counts pennies while a penny takes at least a second', () => {
    expect(cadence(0.01 / 4.2)).toEqual({ coin: 0.01, every: expect.closeTo(4.2, 9) as number });
  });

  it('moves up a coin when pennies come faster than one a second', () => {
    expect(cadence(0.05)?.coin).toBe(0.1);
    expect(cadence(3)?.coin).toBe(10);
  });

  it('stays on the largest coin at absurd rates', () => {
    expect(cadence(1_000)).toEqual({ coin: 100, every: 0.1 });
  });

  it('is null for a stopped stream', () => {
    expect(cadence(0)).toBeNull();
    expect(cadence(Number.NaN)).toBeNull();
  });

  it('counts in a chosen coin, however fast or slow', () => {
    expect(cadence(0.016, 0.01)).toEqual({ coin: 0.01, every: expect.closeTo(0.625, 9) as number });
    expect(cadence(0.001, 1)).toEqual({ coin: 1, every: expect.closeTo(1000, 9) as number });
  });
});

describe('timeToEarn', () => {
  it('is how long a thing takes to earn', () => {
    expect(timeToEarn(5, 0.001)).toBeCloseTo(5_000, 9);
    expect(timeToEarn(5, 0)).toBe(Infinity);
  });
});
