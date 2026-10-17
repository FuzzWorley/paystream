import { describe, expect, it } from 'vitest';
import { cadence, timeToEarn } from './cadence';

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

describe('timeToEarn', () => {
  it('is how long a thing takes to earn', () => {
    expect(timeToEarn(5, 0.001)).toBeCloseTo(5_000, 9);
    expect(timeToEarn(5, 0)).toBe(Infinity);
  });
});
