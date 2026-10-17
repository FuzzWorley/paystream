import { describe, expect, it } from 'vitest';
import { formatCoin, formatDuration, formatPercent, formatUsd } from './format';

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

describe('formatDuration', () => {
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
