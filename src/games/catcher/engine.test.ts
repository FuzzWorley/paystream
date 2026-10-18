import { describe, expect, it } from 'vitest';
import { rng } from '../random';
import { BOARD, JAR, advance, fairShare, keptShare, moveJar, newRound, sharesFromRates } from './engine';

const SHARES = sharesFromRates([
  { id: 'you', rate: 0.7712, mine: true },
  { id: 'federal', rate: 0.1023, mine: false },
  { id: 'socialSecurity', rate: 0.062, mine: false },
  { id: 'state', rate: 0.05, mine: false },
  { id: 'medicare', rate: 0.0145, mine: false },
  { id: 'none', rate: 0, mine: false },
]);

describe('sharesFromRates', () => {
  it('drops streams at zero', () => {
    expect(SHARES.map((s) => s.id)).toEqual(['you', 'federal', 'socialSecurity', 'state', 'medicare']);
  });
});

describe('moveJar', () => {
  it('keeps the jar on the board', () => {
    const r = newRound(SHARES, 1, rng(1));
    moveJar(r, -50);
    expect(r.jarX).toBe(JAR.width / 2);
    moveJar(r, 9999);
    expect(r.jarX).toBe(BOARD.width - JAR.width / 2);
  });
});

// The fairness promise (D13, D29): coins arrive in the real split, and untouched they land
// with their owners, so chance keeps exactly your share. Seeded, the same sweep every run.
describe('honest odds', () => {
  it('rains coins in proportion to the split, and keeps your share when nothing is caught', () => {
    const random = rng(20261017);
    const counts: Record<string, number> = {};
    let kept = 0;
    let total = 0;
    for (let round = 0; round < 40; round++) {
      const r = newRound(SHARES, 1, random);
      // A jar parked off the board catches nothing: the round is left to chance.
      r.jarX = -1000;
      while (!r.over) {
        advance(r, 1 / 60);
        for (const e of r.fresh) counts[e.share.id] = (counts[e.share.id] ?? 0) + 1;
        r.fresh = [];
      }
      kept += r.kept;
      total += r.kept + r.taxed;
      expect(r.snatched).toBe(0);
    }
    const fair = fairShare(newRound(SHARES, 1, random));
    for (const s of SHARES) {
      const p = s.weight / SHARES.reduce((sum, x) => sum + x.weight, 0);
      const share = (counts[s.id] ?? 0) / total;
      expect(Math.abs(share - p)).toBeLessThan(4 * Math.sqrt((p * (1 - p)) / total));
    }
    expect(Math.abs(kept / total - fair)).toBeLessThan(4 * Math.sqrt((fair * (1 - fair)) / total));
  });
});

describe('a round', () => {
  it('catches what falls into the jar, snatching tax coins, and ends once the board is clear', () => {
    const r = newRound(SHARES, 1, rng(3));
    expect(keptShare(r)).toBeNull();
    // Chase every coin: a perfect player catches all of them.
    while (!r.over) {
      const lowest = [...r.coins].sort((a, b) => b.y - a.y)[0];
      if (lowest) moveJar(r, lowest.x);
      advance(r, 1 / 120);
    }
    expect(r.taxed).toBeLessThan(r.kept * 0.2);
    expect(r.snatched).toBeGreaterThan(0);
    expect(keptShare(r)).toBeGreaterThan(fairShare(r));
  });
});
