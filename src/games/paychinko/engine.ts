// Paychinko's rules and physics (D28). Pure: no DOM, no clock, no Math.random; time and
// randomness are passed in, so a seeded sweep can prove the odds honest.
//
// Honest odds: the bins ride a wrap-around belt that scrolls at a steady speed. Wherever a ball
// lands, an unaimed drop meets the belt at a uniformly random phase, so each bin is hit in
// exactly its width's share, and widths are the real split. Skill (timing, aim, nudges) is how
// you beat it.

export const BOARD = { width: 300, height: 420 } as const;
export const BALL_R = 6;
export const PEG_R = 3;
/** Where balls start, and the line at which a ball has landed in the belt. */
export const DROP_Y = 24;
export const BELT_TOP = BOARD.height - 34;

const GRAVITY = 1100; // px/s²: a ball crosses the board in about two seconds
const PEG_BOUNCE = 0.4;
const WALL_BOUNCE = 0.6;
/** A bounce leaves at a slightly random angle, so no ball balances on a peg. */
const JITTER = 0.25;
const NUDGE_SPEED = 90; // px/s, sideways
const MIN_ROLL = 25; // px/s, sideways speed a ball keeps off the top of a peg
export const NUDGES_PER_ROUND = 3;
export const ROUND_SECONDS = 60;
/** Board widths per second the belt scrolls; a full lap every 7 s. */
export const BELT_SPEED = 1 / 7;
/** Seconds of holding for the aim marker to sweep across the board once. */
export const AIM_SWEEP_SECONDS = 1.4;
const MAX_STEP = 1 / 240;

export interface Bin {
  id: string;
  /** Share of the belt, 0–1; all bins sum to 1. */
  width: number;
  /** True for the player's own bin. */
  mine: boolean;
}

export interface Peg {
  x: number;
  y: number;
}

export interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export interface Landing {
  bin: Bin;
  /** Where on the board it landed, for the splash. */
  x: number;
}

/** A small, fast, seedable generator (mulberry32): the same seed always plays the same. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Staggered rows of pegs between the drop line and the belt. No peg sits within a ball's
 * width of a wall, where a ball could wedge between the two and never land.
 */
export function layPegs(): Peg[] {
  const pegs: Peg[] = [];
  const rows = 11;
  const top = 70;
  const gap = (BELT_TOP - 30 - top) / (rows - 1);
  const across = 26;
  const clear = 2 * BALL_R + PEG_R + 4;
  for (let r = 0; r < rows; r++) {
    const offset = r % 2 === 0 ? across / 2 : across;
    for (let x = offset; x <= BOARD.width - clear; x += across) {
      if (x >= clear) pegs.push({ x, y: top + r * gap });
    }
  }
  return pegs;
}

/** Bins from the per-second rates of each stream, dropping any that are zero. */
export function binsFromRates(rates: readonly { id: string; rate: number; mine: boolean }[]): Bin[] {
  const flowing = rates.filter((r) => r.rate > 0);
  const total = flowing.reduce((sum, r) => sum + r.rate, 0);
  return total > 0 ? flowing.map((r) => ({ id: r.id, width: r.rate / total, mine: r.mine })) : [];
}

/** Which bin is under board position `x` when the belt has scrolled `phase` (0–1) of a lap. */
export function binAt(x: number, phase: number, bins: readonly Bin[]): Bin | undefined {
  const along = (((x / BOARD.width - phase) % 1) + 1) % 1;
  let edge = 0;
  for (const bin of bins) {
    edge += bin.width;
    if (along < edge) return bin;
  }
  return bins[bins.length - 1];
}

/** The aim marker's position (0–1 across the board) after holding for `held` seconds: it ping-pongs. */
export function aimAt(held: number): number {
  const t = (held / AIM_SWEEP_SECONDS) % 2;
  return t <= 1 ? t : 2 - t;
}

/** A new ball above the board at `aim` (0–1), clear of the walls. */
export function dropBall(aim: number): Ball {
  const x = BALL_R + aim * (BOARD.width - 2 * BALL_R);
  return { x, y: DROP_Y, vx: 0, vy: 0 };
}

/** Pushes every falling ball sideways: a nudge of the cabinet. */
export function nudge(balls: Ball[], direction: 1 | -1): void {
  for (const b of balls) b.vx += direction * NUDGE_SPEED;
}

/**
 * Advances balls by `dt` seconds in small fixed steps, bouncing off pegs and walls. Returns
 * the balls that reached the belt this call (removed from `balls`), with the board x they
 * landed at.
 */
export function stepBalls(balls: Ball[], pegs: readonly Peg[], dt: number, random: () => number): Ball[] {
  const landed: Ball[] = [];
  let left = dt;
  while (left > 1e-9) {
    const h = Math.min(MAX_STEP, left);
    left -= h;
    for (let i = balls.length - 1; i >= 0; i--) {
      const b = balls[i];
      if (!b) continue;
      b.vy += GRAVITY * h;
      b.x += b.vx * h;
      b.y += b.vy * h;
      if (b.x < BALL_R) {
        b.x = BALL_R;
        b.vx = Math.abs(b.vx) * WALL_BOUNCE;
      } else if (b.x > BOARD.width - BALL_R) {
        b.x = BOARD.width - BALL_R;
        b.vx = -Math.abs(b.vx) * WALL_BOUNCE;
      }
      for (const p of pegs) {
        const dx = b.x - p.x;
        const dy = b.y - p.y;
        const reach = BALL_R + PEG_R;
        const d2 = dx * dx + dy * dy;
        if (d2 >= reach * reach || d2 === 0) continue;
        const d = Math.sqrt(d2);
        // Out of the peg, then reflect the velocity about the contact normal, slightly turned.
        const turn = (random() - 0.5) * JITTER;
        const nx = (dx / d) * Math.cos(turn) - (dy / d) * Math.sin(turn);
        const ny = (dx / d) * Math.sin(turn) + (dy / d) * Math.cos(turn);
        b.x = p.x + (dx / d) * reach;
        b.y = p.y + (dy / d) * reach;
        const along = b.vx * nx + b.vy * ny;
        if (along < 0) {
          b.vx -= (1 + PEG_BOUNCE) * along * nx;
          b.vy -= (1 + PEG_BOUNCE) * along * ny;
        }
        // Off the top of a peg, always roll away from its centre, so no ball balances there.
        if (dy < 0 && Math.abs(b.vx) < MIN_ROLL) {
          const side = dx !== 0 ? Math.sign(dx) : random() < 0.5 ? -1 : 1;
          b.vx = side * MIN_ROLL;
        }
      }
      if (b.y >= BELT_TOP) {
        landed.push(b);
        balls.splice(i, 1);
      }
    }
  }
  return landed;
}
