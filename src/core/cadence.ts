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
export type Coin = (typeof COINS)[number];
/** 'auto' lets each stream pick its own readable coin; a coin counts every stream in it. */
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

/** A coin is worth offering while your own stream drops one between every 0.2 s and every hour. */
const SENSIBLE = { fastest: 0.2, slowest: 3600 };

/**
 * The coins worth cycling through for a take-home rate: 'auto' first, then each sensible
 * coin, skipping one that would look the same as 'auto' (every stream already on it).
 */
export function coinChoices(youRate: number, autoCoins: readonly Coin[]): CoinChoice[] {
  const sensible = COINS.filter(
    (c) => youRate > 0 && c / youRate >= SENSIBLE.fastest && c / youRate <= SENSIBLE.slowest,
  );
  const first = autoCoins[0];
  const uniform = first !== undefined && autoCoins.every((c) => c === first) ? first : null;
  return ['auto', ...sensible.filter((c) => c !== uniform)];
}

/** The choice after `current`, wrapping to 'auto'; a coin no longer offered goes back to 'auto'. */
export function nextCoinChoice(current: CoinChoice, choices: readonly CoinChoice[]): CoinChoice {
  const i = choices.indexOf(current);
  return choices[i + 1] ?? 'auto';
}

/** Seconds to earn `amount` at `ratePerSecond` ("a month's rent every 9.4 days"). */
export function timeToEarn(amount: number, ratePerSecond: number): number {
  return ratePerSecond > 0 ? amount / ratePerSecond : Infinity;
}
