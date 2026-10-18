// Tax snake's rules (D29). Pure: time and randomness are passed in.
//
// Every coin you eat is a minute of gross pay: its take-home is yours, and its taxes join the
// snake as one segment, of a tax drawn in proportion to the real tax split, so a heavier tax
// burden is a longer, harder snake. Now and then a gold coin appears: tax-free, no segment.
import { pickWeighted } from '../random';

export const GRID = { cols: 15, rows: 19 } as const;
export const ROUND_SECONDS = 60;
/** Seconds a gold coin stays before vanishing, and how many coins between golds. */
export const GOLD_SECONDS = 6;
export const GOLD_EVERY = 5;

export type Direction = 'up' | 'down' | 'left' | 'right';

export interface Cell {
  x: number;
  y: number;
}

export interface Segment extends Cell {
  /** 'head', 'you' for the starting body, or the tax this segment carries. */
  kind: string;
}

export interface TaxShare {
  id: string;
  weight: number;
}

export interface Round {
  /** Take-home share of each coin, 0–1. */
  youShare: number;
  taxes: TaxShare[];
  coinValue: number;
  time: number;
  snake: Segment[];
  heading: Direction;
  /** Turns pressed since the last move, applied one per move. */
  turns: Direction[];
  /** Seconds until the next move. */
  untilMove: number;
  coin: Cell;
  gold: (Cell & { left: number }) | null;
  eaten: number;
  kept: number;
  taxed: number;
  /** Segments to add on the next moves. */
  growing: string[];
  crashed: boolean;
  over: boolean;
  /** Things that happened since the renderer last looked. */
  fresh: ('coin' | 'gold' | 'crash')[];
  random: () => number;
}

const VECTORS: Record<Direction, Cell> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};
const OPPOSITE: Record<Direction, Direction> = { up: 'down', down: 'up', left: 'right', right: 'left' };

/** Seconds per move: brisk at first, quicker with every coin, never frantic. */
export const moveEvery = (eaten: number) => Math.max(0.085, 0.17 - eaten * 0.004);

const same = (a: Cell, b: Cell) => a.x === b.x && a.y === b.y;

/** A random empty cell, or null when the snake fills the board. */
function emptyCell(r: Round, avoid: readonly Cell[] = []): Cell | null {
  const taken = new Set([...r.snake, ...avoid].map((c) => c.y * GRID.cols + c.x));
  const free = GRID.cols * GRID.rows - taken.size;
  if (free <= 0) return null;
  let n = Math.floor(r.random() * free);
  for (let i = 0; i < GRID.cols * GRID.rows; i++) {
    if (taken.has(i)) continue;
    if (n-- === 0) return { x: i % GRID.cols, y: Math.floor(i / GRID.cols) };
  }
  return null;
}

export function newRound(
  youShare: number,
  taxes: TaxShare[],
  coinValue: number,
  random: () => number,
): Round {
  const y = Math.floor(GRID.rows / 2);
  const r: Round = {
    youShare,
    taxes: taxes.filter((t) => t.weight > 0),
    coinValue,
    time: 0,
    snake: [
      { x: 4, y, kind: 'head' },
      { x: 3, y, kind: 'you' },
      { x: 2, y, kind: 'you' },
    ],
    heading: 'right',
    turns: [],
    untilMove: moveEvery(0),
    coin: { x: 0, y: 0 },
    gold: null,
    eaten: 0,
    kept: 0,
    taxed: 0,
    growing: [],
    crashed: false,
    over: false,
    fresh: [],
    random,
  };
  r.coin = emptyCell(r) ?? { x: 0, y: 0 };
  return r;
}

/** Queues a turn; reversing into yourself, or repeating a direction, is ignored. */
export function turn(r: Round, to: Direction): void {
  const last = r.turns[r.turns.length - 1] ?? r.heading;
  if (to !== last && to !== OPPOSITE[last] && r.turns.length < 2) r.turns.push(to);
}

function move(r: Round): void {
  r.heading = r.turns.shift() ?? r.heading;
  const head = r.snake[0];
  if (!head) return;
  const v = VECTORS[r.heading];
  const next: Cell = { x: head.x + v.x, y: head.y + v.y };
  const grows = r.growing.length > 0;
  // The tail moves away this step unless the snake is growing, so it isn't in the way.
  const body = grows ? r.snake : r.snake.slice(0, -1);
  const outside = next.x < 0 || next.y < 0 || next.x >= GRID.cols || next.y >= GRID.rows;
  if (outside || body.some((s) => same(s, next))) {
    r.crashed = true;
    r.over = true;
    r.fresh.push('crash');
    return;
  }
  // The old head becomes body; a new segment, if any, joins where the tail was.
  const tail = r.snake[r.snake.length - 1];
  const tailWas = tail ? { x: tail.x, y: tail.y } : null;
  for (let i = r.snake.length - 1; i > 0; i--) {
    const s = r.snake[i];
    const ahead = r.snake[i - 1];
    if (s && ahead) {
      s.x = ahead.x;
      s.y = ahead.y;
    }
  }
  head.x = next.x;
  head.y = next.y;
  if (grows && tailWas) r.snake.push({ ...tailWas, kind: r.growing.shift() ?? 'you' });
  if (same(head, r.coin)) {
    r.eaten += 1;
    r.kept += r.coinValue * r.youShare;
    r.taxed += r.coinValue * (1 - r.youShare);
    r.growing.push(pickWeighted(r.taxes, r.random)?.id ?? 'you');
    r.fresh.push('coin');
    r.coin = emptyCell(r, r.gold ? [r.gold] : []) ?? r.coin;
    if (r.eaten % GOLD_EVERY === 0 && !r.gold) {
      const spot = emptyCell(r, [r.coin]);
      if (spot) r.gold = { ...spot, left: GOLD_SECONDS };
    }
  } else if (r.gold && same(head, r.gold)) {
    r.eaten += 1;
    r.kept += r.coinValue;
    r.fresh.push('gold');
    r.gold = null;
  }
}

export function advance(r: Round, dt: number): void {
  if (r.over) return;
  r.time = Math.min(ROUND_SECONDS, r.time + dt);
  if (r.gold) {
    r.gold.left -= dt;
    if (r.gold.left <= 0) r.gold = null;
  }
  r.untilMove -= dt;
  while (r.untilMove <= 0) {
    move(r);
    if (r.crashed) return;
    r.untilMove += moveEvery(r.eaten);
  }
  if (r.time >= ROUND_SECONDS) r.over = true;
}

/** The segment length the snake will reach with everything owed to it. */
export const fullLength = (r: Round) => r.snake.length + r.growing.length;
