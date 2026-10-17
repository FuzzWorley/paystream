import type { Clock } from './types';

/** How rates are shown (D14): time per coin, or an amount per minute, hour or day. */
export const RATE_UNITS = ['penny', 'minute', 'hour', 'day'] as const;
export type RateUnit = (typeof RATE_UNITS)[number];
export type TimeUnit = Exclude<RateUnit, 'penny'>;

/** Seconds in a minute, hour or day of earning; on the work clock a day is a workday. */
export function unitSeconds(unit: TimeUnit, clock: Clock): number {
  if (unit === 'minute') return 60;
  if (unit === 'hour') return 3600;
  return clock.kind === 'around' ? 86_400 : (clock.hoursPerWeek / 5) * 3600;
}

/** Coins a stream can be counted in, smallest first, in dollars. */
export const COINS = [0.01, 0.1, 1, 10, 100] as const;

export interface Cadence {
  coin: number;
  /** Seconds between coins. */
  every: number;
}

/**
 * "1¢ every 4.2 s": the smallest coin that takes at least a second to arrive, so the figure
 * stays countable at any salary. Null for a stream that has stopped.
 */
export function cadence(ratePerSecond: number): Cadence | null {
  if (!(ratePerSecond > 0)) return null;
  const coin = COINS.find((c) => c / ratePerSecond >= 1) ?? COINS[4];
  return { coin, every: coin / ratePerSecond };
}

/** Seconds to earn `amount` at `ratePerSecond` ("a month's rent every 9.4 days"). */
export function timeToEarn(amount: number, ratePerSecond: number): number {
  return ratePerSecond > 0 ? amount / ratePerSecond : Infinity;
}
