// Coin catcher's rules (D29). Pure: time and randomness are passed in.
//
// Honest odds: each falling coin belongs to a recipient drawn in proportion to the real split,
// and a coin that reaches the floor goes to its recipient. Left alone, you keep exactly your
// share. Your jar catches coins before they land, and anything it catches is yours, so the
// skill is snatching the taxman's coins, which wobble as they fall.
import { pickWeighted } from '../random';

export const BOARD = { width: 300, height: 420 } as const;
export const COIN_R = 8;
export const JAR = { width: 62, height: 30, top: 372 } as const;
/** Where an uncaught coin lands. */
export const FLOOR = BOARD.height - 8;
export const ROUND_SECONDS = 60;

export interface Share {
  id: string;
  weight: number;
  mine: boolean;
}

export interface Coin {
  x: number;
  y: number;
  /** The centre line it wobbles about, and how far. */
  baseX: number;
  wobble: number;
  phase: number;
  vy: number;
  share: Share;
}

export type Event = { kind: 'caught' | 'landed'; share: Share; x: number };

export interface Round {
  shares: Share[];
  /** Dollars per coin: a minute of gross pay. */
  coinValue: number;
  time: number;
  coins: Coin[];
  /** The jar's centre. */
  jarX: number;
  kept: number;
  taxed: number;
  /** Tax coins snatched: the taxman's money you caught. */
  snatched: number;
  untilNext: number;
  fresh: Event[];
  over: boolean;
  random: () => number;
}

/** Coins a second: a drizzle that becomes a downpour. */
export const spawnRate = (t: number) => 1.3 + 1.7 * Math.min(1, t / ROUND_SECONDS);
/** Fall speed in px/s, quickening over the round. */
export const fallSpeed = (t: number) => 140 + 130 * Math.min(1, t / ROUND_SECONDS);

/** Shares from the per-second rate of each stream, dropping any at zero. */
export function sharesFromRates(rates: readonly { id: string; rate: number; mine: boolean }[]): Share[] {
  return rates.filter((r) => r.rate > 0).map((r) => ({ id: r.id, weight: r.rate, mine: r.mine }));
}

export function newRound(shares: Share[], coinValue: number, random: () => number): Round {
  return {
    shares,
    coinValue,
    time: 0,
    coins: [],
    jarX: BOARD.width / 2,
    kept: 0,
    taxed: 0,
    snatched: 0,
    untilNext: 0.4,
    fresh: [],
    over: false,
    random,
  };
}

export function moveJar(r: Round, x: number): void {
  r.jarX = Math.min(BOARD.width - JAR.width / 2, Math.max(JAR.width / 2, x));
}

/** The share chance alone gives you: your weight over the total. */
export function fairShare(r: Round): number {
  const total = r.shares.reduce((sum, s) => sum + s.weight, 0);
  return total > 0 ? r.shares.filter((s) => s.mine).reduce((sum, s) => sum + s.weight, 0) / total : 0;
}

export function keptShare(r: Round): number | null {
  const total = r.kept + r.taxed;
  return total > 0 ? r.kept / total : null;
}

function spawn(r: Round): void {
  const share = pickWeighted(r.shares, r.random);
  if (!share) return;
  // The taxman's coins wobble; yours fall straight.
  const wobble = share.mine ? 0 : 14 + r.random() * 18;
  const margin = COIN_R + wobble;
  const baseX = margin + r.random() * (BOARD.width - 2 * margin);
  r.coins.push({
    x: baseX,
    y: -COIN_R,
    baseX,
    wobble,
    phase: r.random() * Math.PI * 2,
    vy: fallSpeed(r.time),
    share,
  });
}

export function advance(r: Round, dt: number): void {
  if (r.over) return;
  r.time = Math.min(ROUND_SECONDS, r.time + dt);
  if (r.time < ROUND_SECONDS) {
    r.untilNext -= dt;
    while (r.untilNext <= 0) {
      spawn(r);
      // Exponential gaps: arrivals as a Poisson stream at the current rate.
      r.untilNext += -Math.log(1 - r.random()) / spawnRate(r.time);
    }
  }
  const half = JAR.width / 2;
  for (let i = r.coins.length - 1; i >= 0; i--) {
    const c = r.coins[i];
    if (!c) continue;
    const before = c.y;
    c.y += c.vy * dt;
    c.x = c.baseX + c.wobble * Math.sin(c.phase + c.y / 38);
    const crossesRim = before + COIN_R < JAR.top && c.y + COIN_R >= JAR.top;
    if (crossesRim && Math.abs(c.x - r.jarX) <= half) {
      r.kept += r.coinValue;
      if (!c.share.mine) r.snatched += r.coinValue;
      r.fresh.push({ kind: 'caught', share: c.share, x: c.x });
      r.coins.splice(i, 1);
    } else if (c.y >= FLOOR) {
      if (c.share.mine) r.kept += r.coinValue;
      else r.taxed += r.coinValue;
      r.fresh.push({ kind: 'landed', share: c.share, x: c.x });
      r.coins.splice(i, 1);
    }
  }
  if (r.time >= ROUND_SECONDS && r.coins.length === 0) r.over = true;
}
