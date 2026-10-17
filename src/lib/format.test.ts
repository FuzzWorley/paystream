import { describe, expect, it } from 'vitest';
import {
  formatAmount,
  formatCoin,
  formatCountdown,
  formatDate,
  formatDigits,
  formatDuration,
  formatPercent,
  formatUsd,
} from './format';

describe('formatUsd', () => {
  it.each([
    [57_842.5, 2, '$57,842.50'],
    [0.01234, 4, '$0.0123'],
    [1_087.5, 0, '$1,088'],
    [-0, 2, '$0.00'],
    [-0.001, 2, '$0.00'],
  ])('%d to %d places is %s', (amount, decimals, shown) => {
    expect(formatUsd(amount, decimals)).toBe(shown);
  });

  it('defaults to cents', () => {
    expect(formatUsd(7_670)).toBe('$7,670.00');
  });
});

describe('formatAmount', () => {
  it.each([
    [0.1101, '11¢'],
    [0.004, '0.4¢'],
    [0, '0¢'],
    [0.996, '$1.00'],
    [6.603, '$6.60'],
    [158.4726, '$158.47'],
    [1_240.4, '$1,240'],
  ])('%d is %s', (dollars, shown) => {
    expect(formatAmount(dollars)).toBe(shown);
  });
});

describe('formatDigits', () => {
  it('groups thousands', () => {
    expect(formatDigits(75_000)).toBe('75,000');
    expect(formatDigits(0)).toBe('0');
  });
});

describe('formatCoin', () => {
  it.each([
    [0.01, '1¢'],
    [0.1, '10¢'],
    [1, '$1'],
    [100, '$100'],
  ])('%d is %s', (coin, shown) => {
    expect(formatCoin(coin)).toBe(shown);
  });
});

describe('formatPercent', () => {
  it.each([
    [0.062, '6.2%'],
    [0.0145, '1.45%'],
    [0.771, '77.1%'],
    [-0, '0%'],
  ])('%d is %s', (fraction, shown) => {
    expect(formatPercent(fraction)).toBe(shown);
  });
});

describe('formatDate', () => {
  it('is a short local date', () => {
    expect(formatDate(new Date(2026, 7, 3, 15).getTime())).toBe('Aug 3');
  });
});

describe('formatCountdown', () => {
  it.each([
    [2.34, '2.3 s'],
    [59.9, '59.9 s'],
    [59.97, '1m 00s'],
    [252, '4m 12s'],
    [2 * 3600 + 5 * 60, '2h 05m'],
    [3 * 86_400 + 4 * 3600, '3d 4h'],
  ])('%d s reads %s', (seconds, shown) => {
    expect(formatCountdown(seconds)).toBe(shown);
  });

  it('is null when nothing is coming', () => {
    expect(formatCountdown(Infinity)).toBeNull();
    expect(formatCountdown(-1)).toBeNull();
  });
});

describe('formatDuration', () => {
  it.each([
    // Under a second, two decimals: adding 5.75% state tax at $170k at work moves take-home
    // from 0.59 s to 0.64 s a penny, which one decimal showed as "0.6 s" both times.
    [127_461 / 7_488_000, '0.59 s', 0.01],
    [117_686 / 7_488_000, '0.64 s', 0.01],
    [1 / 0.9995, '1.0 s', 1],
  ])('a coin at %d a second arrives every %s', (rate, shown, coin) => {
    expect(formatDuration(coin / rate)).toBe(shown);
  });

  it.each([
    [4.2, '4.2 s'],
    [9.96, '10 s'],
    [42, '42 s'],
    [99.7, '1.7 min'],
    [36 * 60, '36 min'],
    [2.3 * 3600, '2.3 h'],
    [47 * 3600, '47 h'],
    [9.4 * 86_400, '9.4 days'],
    [120 * 86_400, '120 days'],
  ])('%d s reads %s', (seconds, shown) => {
    expect(formatDuration(seconds)).toBe(shown);
  });

  it('is null for a stream that never arrives', () => {
    expect(formatDuration(Infinity)).toBeNull();
    expect(formatDuration(-1)).toBeNull();
  });
});
