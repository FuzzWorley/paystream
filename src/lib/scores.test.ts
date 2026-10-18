import { describe, expect, it } from 'vitest';
import { parseScores } from './scores';

describe('parseScores', () => {
  it('keeps valid bests', () => {
    expect(parseScores({ paychinko: { beat: 0.14, kept: 0.91, at: 1 } })).toEqual({
      paychinko: { beat: 0.14, kept: 0.91, at: 1 },
    });
  });

  it('drops anything malformed or out of range, game by game', () => {
    expect(
      parseScores({
        a: { beat: '0.1', kept: 0.5, at: 1 },
        b: { beat: 2, kept: 0.5, at: 1 },
        c: { beat: 0.1, kept: 1.5, at: 1 },
        d: null,
        e: { beat: 0.1, kept: 0.5, at: Number.NaN },
        ok: { beat: -0.05, kept: 0.7, at: 2 },
      }),
    ).toEqual({ ok: { beat: -0.05, kept: 0.7, at: 2 } });
    expect(parseScores(null)).toEqual({});
    expect(parseScores('x')).toEqual({});
  });
});
