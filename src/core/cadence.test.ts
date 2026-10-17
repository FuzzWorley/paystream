import { describe, expect, it } from 'vitest';
import { cadence, coinChoices, nextCoinChoice, timeToEarn, unitSeconds } from './cadence';

describe('unitSeconds', () => {
  it('is a plain minute, hour or day around the clock', () => {
    const around = { kind: 'around' } as const;
    expect([unitSeconds('minute', around), unitSeconds('hour', around), unitSeconds('day', around)]).toEqual([
      60, 3600, 86_400,
    ]);
  });

  it('makes a day a workday on the work clock', () => {
    expect(unitSeconds('day', { kind: 'work', hoursPerWeek: 40, weeksPerYear: 52 })).toBe(8 * 3600);
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
});

describe('cadence with a chosen coin', () => {
  it('counts every stream in that coin, however fast or slow', () => {
    expect(cadence(0.016, 0.01)).toEqual({ coin: 0.01, every: expect.closeTo(0.625, 9) as number });
    expect(cadence(0.001, 1)).toEqual({ coin: 1, every: expect.closeTo(1000, 9) as number });
  });
});

describe('coinChoices', () => {
  // $170k at work: take-home ≈ 1.6¢ a second.
  const youRate = 0.016;

  it('offers auto, then each coin that lands between every 0.2 s and every hour', () => {
    expect(coinChoices(youRate, [0.1, 0.01, 0.01, 0.01])).toEqual(['auto', 0.01, 0.1, 1, 10]);
  });

  it('skips a coin that would look the same as auto', () => {
    expect(coinChoices(0.002, [0.01, 0.01, 0.01])).toEqual(['auto', 0.1, 1]);
  });

  it('offers only auto when nothing flows', () => {
    expect(coinChoices(0, [])).toEqual(['auto']);
  });
});

describe('nextCoinChoice', () => {
  const choices = ['auto', 0.01, 0.1, 1] as const;

  it('steps through and wraps back to auto', () => {
    expect(nextCoinChoice('auto', choices)).toBe(0.01);
    expect(nextCoinChoice(0.1, choices)).toBe(1);
    expect(nextCoinChoice(1, choices)).toBe('auto');
  });

  it('goes back to auto when the current coin is no longer offered', () => {
    expect(nextCoinChoice(100, choices)).toBe('auto');
  });
});

describe('timeToEarn', () => {
  it('is how long a thing takes to earn', () => {
    expect(timeToEarn(5, 0.001)).toBeCloseTo(5_000, 9);
    expect(timeToEarn(5, 0)).toBe(Infinity);
  });
});
