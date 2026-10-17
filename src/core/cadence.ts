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
