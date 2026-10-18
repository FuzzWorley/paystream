import { describe, expect, it } from 'vitest';
import { rng } from '../random';
import { GOLD_EVERY, GRID, advance, fullLength, newRound, turn, type Round } from './engine';

const TAXES = [
  { id: 'federal', weight: 0.1023 },
  { id: 'socialSecurity', weight: 0.062 },
  { id: 'state', weight: 0.05 },
  { id: 'medicare', weight: 0.0145 },
];
const YOU = 0.7712;

/** Steps until one move has happened. */
function step(r: Round): void {
  const moves = r.snake[0] ? { x: r.snake[0].x, y: r.snake[0].y } : null;
  for (let i = 0; i < 1000 && !r.over; i++) {
    advance(r, 0.01);
    if (r.snake[0] && moves && (r.snake[0].x !== moves.x || r.snake[0].y !== moves.y)) return;
  }
}

/** Puts the coin directly ahead of the head. */
function coinAhead(r: Round): void {
  const head = r.snake[0];
  if (head) r.coin = { x: head.x + 1, y: head.y };
}

describe('moving', () => {
  it('ignores a reversal and repeats, and crashes into a wall', () => {
    const r = newRound(YOU, TAXES, 1, rng(1));
    r.coin = { x: 0, y: 0 };
    turn(r, 'left');
    turn(r, 'right');
    expect(r.turns).toEqual([]);
    step(r);
    expect(r.snake[0]).toMatchObject({ x: 5 });
    while (!r.over) step(r);
    expect(r.crashed).toBe(true);
    expect(r.fresh).toContain('crash');
  });

  it('crashes into itself', () => {
    const r = newRound(YOU, TAXES, 1, rng(2));
    r.coin = { x: 0, y: 0 };
    r.growing = ['federal', 'federal', 'federal'];
    for (let i = 0; i < 3; i++) step(r);
    turn(r, 'down');
    step(r);
    turn(r, 'left');
    step(r);
    turn(r, 'up');
    step(r);
    expect(r.crashed).toBe(true);
  });
});

describe('eating', () => {
  it('pays the take-home, taxes the rest, and grows by one tax segment', () => {
    const r = newRound(YOU, TAXES, 10, rng(3));
    coinAhead(r);
    step(r);
    expect(r.eaten).toBe(1);
    expect(r.kept).toBeCloseTo(7.712, 9);
    expect(r.taxed).toBeCloseTo(2.288, 9);
    expect(fullLength(r)).toBe(4);
    step(r);
    expect(r.snake).toHaveLength(4);
    expect(TAXES.map((t) => t.id)).toContain(r.snake[3]?.kind);
  });

  it('brings a gold coin every few coins: tax-free, no segment', () => {
    const r = newRound(YOU, TAXES, 10, rng(4));
    for (let i = 0; i < GOLD_EVERY; i++) {
      coinAhead(r);
      step(r);
    }
    expect(r.gold).not.toBeNull();
    const before = { kept: r.kept, length: fullLength(r) };
    const head = r.snake[0];
    if (r.gold && head) Object.assign(r.gold, { x: head.x + 1, y: head.y });
    r.coin = { x: 0, y: GRID.rows - 1 };
    step(r);
    expect(r.kept - before.kept).toBe(10);
    expect(fullLength(r)).toBe(before.length);
    expect(r.gold).toBeNull();
  });

  it('lets an uneaten gold coin vanish', () => {
    const r = newRound(YOU, TAXES, 1, rng(5));
    r.gold = { x: 0, y: 0, left: 0.05 };
    advance(r, 0.06);
    expect(r.gold).toBeNull();
  });
});

describe('a round', () => {
  it('ends after sixty seconds', () => {
    const r = newRound(YOU, TAXES, 1, rng(6));
    // Circle a 2×2 loop forever: never crash.
    const loop = ['down', 'left', 'up', 'right'] as const;
    let k = 0;
    while (!r.over) {
      turn(r, loop[k++ % 4] ?? 'down');
      step(r);
    }
    expect(r.crashed).toBe(false);
    expect(r.time).toBe(60);
  });
});

// The fairness promise (D13, D29): the taxes you carry are drawn in the real tax split.
describe('honest segments', () => {
  it('grows tax segments in proportion to each tax', () => {
    const r = newRound(YOU, TAXES, 1, rng(20261017));
    const counts: Record<string, number> = {};
    const N = 4000;
    for (let i = 0; i < N; i++) {
      // A one-cell snake facing a coin, every time, so it never runs out of room.
      r.snake = [{ x: 2, y: 9, kind: 'head' }];
      r.coin = { x: 3, y: 9 };
      r.heading = 'right';
      r.turns = [];
      // Thousands of meals don't fit one sixty-second round; this test is about the draw.
      r.time = 0;
      step(r);
      const kind = r.growing.pop();
      if (kind) counts[kind] = (counts[kind] ?? 0) + 1;
      r.growing = [];
    }
    const total = TAXES.reduce((sum, t) => sum + t.weight, 0);
    for (const t of TAXES) {
      const p = t.weight / total;
      expect(Math.abs((counts[t.id] ?? 0) / N - p)).toBeLessThan(4 * Math.sqrt((p * (1 - p)) / N));
    }
  });
});
