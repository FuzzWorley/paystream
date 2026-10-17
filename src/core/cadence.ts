import type { Clock } from './types';

/** Time frames an amount can be shown over, shortest first (D17). */
export const TIME_UNITS = ['second', 'minute', 'hour', 'day', 'week', 'month', 'year'] as const;
export type TimeUnit = (typeof TIME_UNITS)[number];

/**
 * Seconds of earning in a span. On the work clock a day is a workday (weekly hours ÷ 5) and a
 * week is the working week; a month is always a twelfth of the earning year.
 */
export function unitSeconds(unit: TimeUnit, clock: Clock, earningYear: number): number {
  const work = clock.kind === 'work';
  switch (unit) {
    case 'second':
      return 1;
    case 'minute':
      return 60;
    case 'hour':
      return 3600;
    case 'day':
      return work ? (clock.hoursPerWeek / 5) * 3600 : 86_400;
    case 'week':
      return work ? clock.hoursPerWeek * 3600 : 7 * 86_400;
    case 'month':
      return earningYear / 12;
    case 'year':
      return earningYear;
  }
}

/** Coins a stream can be counted in, smallest first, in dollars. */
export const COINS = [0.01, 0.1, 1, 10, 100] as const;
export type Coin = (typeof COINS)[number];
/** 'auto' picks the readable coin for take-home until the user chooses one. */
export type CoinChoice = Coin | 'auto';

export interface Cadence {
  coin: Coin;
  /** Seconds between coins. */
  every: number;
}

/**
 * "1¢ every 4.2 s". On 'auto', the smallest coin that takes at least a second to arrive, so
 * the figure stays countable at any salary. Null for a stream that has stopped.
 */
export function cadence(ratePerSecond: number, choice: CoinChoice = 'auto'): Cadence | null {
  if (!(ratePerSecond > 0)) return null;
  const coin = choice !== 'auto' ? choice : (COINS.find((c) => c / ratePerSecond >= 1) ?? COINS[4]);
  return { coin, every: coin / ratePerSecond };
}

/** The next rung up or down a ladder (coins, time frames); null past either end. */
export function stepLadder<T>(ladder: readonly T[], rung: T, direction: 1 | -1): T | null {
  return ladder[ladder.indexOf(rung) + direction] ?? null;
}

/** Seconds to earn `amount` at `ratePerSecond` ("a month's rent every 9.4 days"). */
export function timeToEarn(amount: number, ratePerSecond: number): number {
  return ratePerSecond > 0 ? amount / ratePerSecond : Infinity;
}
