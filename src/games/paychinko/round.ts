// One round of Paychinko: aim, drop, nudge, score. Pure, like the engine.
import { rng } from '../random';
import {
  BELT_SPEED,
  NUDGES_PER_ROUND,
  ROUND_SECONDS,
  aimAt,
  binAt,
  dropBall,
  layPegs,
  nudge,
  stepBalls,
  type Ball,
  type Bin,
  type Landing,
  type Peg,
} from './engine';

/** At most this many balls in play: a new drop waits for room. */
const MAX_BALLS = 6;

export interface Round {
  bins: Bin[];
  pegs: Peg[];
  /** What one ball is worth, in dollars: a minute of gross pay. */
  ballValue: number;
  /** Seconds played; the round ends at ROUND_SECONDS. */
  time: number;
  /** The belt's position, 0–1 of a lap. */
  phase: number;
  balls: Ball[];
  /** Seconds the drop button has been held, or null when it isn't. */
  holding: number | null;
  nudgesLeft: number;
  kept: number;
  taxed: number;
  /** Dollars landed in each bin, by bin id. */
  byBin: Record<string, number>;
  /** Landings since the renderer last looked, for splashes and sound. */
  fresh: Landing[];
  over: boolean;
  random: () => number;
}

export function newRound(bins: Bin[], ballValue: number, seed: number, phase = 0): Round {
  return {
    bins,
    pegs: layPegs(),
    ballValue,
    time: 0,
    phase,
    balls: [],
    holding: null,
    nudgesLeft: NUDGES_PER_ROUND,
    kept: 0,
    taxed: 0,
    byBin: Object.fromEntries(bins.map((b) => [b.id, 0])),
    fresh: [],
    over: false,
    random: rng(seed),
  };
}

export function startHold(r: Round): void {
  if (!r.over && r.holding === null) r.holding = 0;
}

/** Lets go of the drop button: a ball falls from where the aim marker is, if there's room. */
export function release(r: Round): void {
  if (r.holding === null) return;
  if (r.time < ROUND_SECONDS && r.balls.length < MAX_BALLS) r.balls.push(dropBall(aimAt(r.holding)));
  r.holding = null;
}

export function useNudge(r: Round, direction: 1 | -1): boolean {
  if (r.over || r.nudgesLeft === 0 || r.balls.length === 0) return false;
  r.nudgesLeft -= 1;
  nudge(r.balls, direction);
  return true;
}

/** Share of what landed that you kept; null before anything lands. */
export function keptShare(r: Round): number | null {
  const total = r.kept + r.taxed;
  return total > 0 ? r.kept / total : null;
}

/** The share chance alone would give you: the width of your bin. */
export function fairShare(r: Round): number {
  return r.bins.filter((b) => b.mine).reduce((sum, b) => sum + b.width, 0);
}

/** Advances the round by `dt` seconds. Balls still falling when time runs out may land. */
export function advance(r: Round, dt: number): void {
  if (r.over) return;
  r.time = Math.min(ROUND_SECONDS, r.time + dt);
  r.phase = (r.phase + BELT_SPEED * dt) % 1;
  if (r.holding !== null) r.holding += dt;
  for (const b of stepBalls(r.balls, r.pegs, dt, r.random)) {
    const bin = binAt(b.x, r.phase, r.bins);
    if (!bin) continue;
    r.byBin[bin.id] = (r.byBin[bin.id] ?? 0) + r.ballValue;
    if (bin.mine) r.kept += r.ballValue;
    else r.taxed += r.ballValue;
    r.fresh.push({ bin, x: b.x });
  }
  // The round ends once time is up and the last ball has landed.
  if (r.time >= ROUND_SECONDS) {
    r.holding = null;
    if (r.balls.length === 0) r.over = true;
  }
}
