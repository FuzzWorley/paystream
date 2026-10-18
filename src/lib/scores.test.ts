import { describe, expect, it } from 'vitest';
import { parseScores } from './scores';

describe('parseScores', () => {
  it('keeps valid bests', () => {
    expect(parseScores({ paychinko: { value: 0.14, at: 1 }, snake: { value: 23, at: 2 } })).toEqual({
      paychinko: { value: 0.14, at: 1 },
      snake: { value: 23, at: 2 },
    });
  });

  it('drops anything malformed or out of range, game by game', () => {
    expect(
      parseScores({
        a: { value: '0.1', at: 1 },
        b: { value: 2e9, at: 1 },
        c: { value: 1, at: Number.NaN },
        d: null,
        ok: { value: -0.05, at: 2 },
      }),
    ).toEqual({ ok: { value: -0.05, at: 2 } });
    expect(parseScores(null)).toEqual({});
    expect(parseScores('x')).toEqual({});
  });
});
