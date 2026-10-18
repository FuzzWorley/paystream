import { describe, expect, it } from 'vitest';
import {
  BALL_R,
  BELT_SPEED,
  BOARD,
  aimAt,
  binAt,
  binsFromRates,
  dropBall,
  layPegs,
  rng,
  stepBalls,
  type Bin,
} from './engine';
import { advance, fairShare, keptShare, newRound, release, startHold, useNudge } from './round';

// A split like $75k single with a 5% state rate (shares summing to 1); any split works.
const BINS: Bin[] = binsFromRates([
  { id: 'you', rate: 0.7712, mine: true },
  { id: 'federal', rate: 0.1023, mine: false },
  { id: 'socialSecurity', rate: 0.062, mine: false },
  { id: 'state', rate: 0.05, mine: false },
  { id: 'medicare', rate: 0.0145, mine: false },
]);

describe('binsFromRates', () => {
  it('makes widths from rates, summing to 1, and drops streams at zero', () => {
    const bins = binsFromRates([
      { id: 'you', rate: 3, mine: true },
      { id: 'federal', rate: 1, mine: false },
      { id: 'socialSecurity', rate: 0, mine: false },
    ]);
    expect(bins.map((b) => b.id)).toEqual(['you', 'federal']);
    expect(bins.map((b) => b.width)).toEqual([0.75, 0.25]);
  });

  it('is empty when nothing flows', () => {
    expect(binsFromRates([{ id: 'you', rate: 0, mine: true }])).toEqual([]);
  });
});

describe('binAt', () => {
  it('reads the belt from the left edge, wrapping as it scrolls', () => {
    const two: Bin[] = [
      { id: 'a', width: 0.25, mine: true },
      { id: 'b', width: 0.75, mine: false },
    ];
    expect(binAt(0, 0, two)?.id).toBe('a');
    expect(binAt(BOARD.width * 0.3, 0, two)?.id).toBe('b');
    // Scrolled a tenth of a lap: the board's left edge now shows the end of the belt.
    expect(binAt(0, 0.1, two)?.id).toBe('b');
    expect(binAt(BOARD.width * 0.2, 0.1, two)?.id).toBe('a');
    expect(binAt(BOARD.width, 0, two)?.id).toBe('a');
  });
});

describe('aimAt', () => {
  it('sweeps across and back while held', () => {
    expect(aimAt(0)).toBe(0);
    expect(aimAt(0.7)).toBeCloseTo(0.5, 9);
    expect(aimAt(1.4)).toBeCloseTo(1, 9);
    expect(aimAt(2.1)).toBeCloseTo(0.5, 9);
    expect(aimAt(2.8)).toBeCloseTo(0, 9);
  });
});

describe('physics', () => {
  it('lands every ball, inside the walls, within a few seconds', () => {
    const pegs = layPegs();
    const random = rng(7);
    for (let i = 0; i < 300; i++) {
      const balls = [dropBall(random())];
      let landed: { x: number }[] = [];
      for (let t = 0; t < 8 && landed.length === 0; t += 1 / 60)
        landed = stepBalls(balls, pegs, 1 / 60, random);
      expect(landed).toHaveLength(1);
      expect(landed[0]?.x).toBeGreaterThanOrEqual(BALL_R);
      expect(landed[0]?.x).toBeLessThanOrEqual(BOARD.width - BALL_R);
    }
  });
});

// The fairness promise (D13, D28): a ball left to chance lands in each bin in proportion to its
// width — the real split. Seeded, so it is the same sweep every run.
describe('honest odds', () => {
  it('lands unaimed drops in proportion to the split', () => {
    const pegs = layPegs();
    const random = rng(20261017);
    const DROPS = 4000;
    const hits: Record<string, number> = {};
    for (let i = 0; i < DROPS; i++) {
      const balls = [dropBall(random())];
      // Dropped at a random moment, so the belt is wherever it happens to be.
      let phase = random();
      let landed: { x: number }[] = [];
      for (let t = 0; t < 10 && landed.length === 0; t += 1 / 60) {
        landed = stepBalls(balls, pegs, 1 / 60, random);
        phase = (phase + BELT_SPEED / 60) % 1;
      }
      expect(landed).toHaveLength(1);
      const bin = binAt(landed[0]?.x ?? 0, phase, BINS);
      if (bin) hits[bin.id] = (hits[bin.id] ?? 0) + 1;
    }
    for (const bin of BINS) {
      const share = (hits[bin.id] ?? 0) / DROPS;
      // Four standard errors: a fair belt fails this about once in 16,000 seeds.
      const tolerance = 4 * Math.sqrt((bin.width * (1 - bin.width)) / DROPS);
      expect(Math.abs(share - bin.width)).toBeLessThan(tolerance);
    }
  });
});

describe('a round', () => {
  it('drops on release, scores landings, and ends when time is up and the board is clear', () => {
    const r = newRound(BINS, 1, 1);
    expect(keptShare(r)).toBeNull();
    startHold(r);
    advance(r, 0.5);
    release(r);
    expect(r.balls).toHaveLength(1);
    expect(useNudge(r, 1)).toBe(true);
    expect(r.nudgesLeft).toBe(2);
    for (let t = 0; t < 61; t += 1 / 30) advance(r, 1 / 30);
    expect(r.over).toBe(true);
    expect(r.kept + r.taxed).toBe(1);
    expect(r.fresh).toHaveLength(1);
    expect(fairShare(r)).toBeCloseTo(0.7712, 9);
  });

  it('has no nudge without a falling ball, and no drop once time is up', () => {
    const r = newRound(BINS, 1, 2);
    expect(useNudge(r, -1)).toBe(false);
    advance(r, 60);
    startHold(r);
    release(r);
    expect(r.balls).toHaveLength(0);
    expect(r.over).toBe(true);
  });
});
