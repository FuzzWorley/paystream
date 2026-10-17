import { describe, expect, it } from 'vitest';
import { TABLE_2026 } from './tables/2026';
import { annualBreakdown, incomeTax } from './tax';
import type { FilingStatus, TaxInputs } from './types';

const inputs = (over: Partial<TaxInputs> = {}): TaxInputs => ({
  salary: 75_000,
  filingStatus: 'single',
  stateRate: 0,
  overrides: {},
  ...over,
});

// Rev. Proc. 2025-32 Tables 1–4 print the tax owed at the start of each bracket ("$5,800 plus
// 22% of the excess over $50,400"). Recomputing them from our thresholds and rates checks
// the transcription against the IRS's own arithmetic.
const IRS_TAX_AT_BRACKET_START: Record<FilingStatus, [number, number][]> = {
  married_joint: [
    [24_800, 2_480],
    [100_800, 11_600],
    [211_400, 35_932],
    [403_550, 82_048],
    [512_450, 116_896],
    [768_700, 206_583.5],
  ],
  head_of_household: [
    [17_700, 1_770],
    [67_450, 7_740],
    [105_700, 16_155],
    [201_750, 39_207],
    [256_200, 56_631],
    [640_600, 191_171],
  ],
  single: [
    [12_400, 1_240],
    [50_400, 5_800],
    [105_700, 17_966],
    [201_775, 41_024],
    [256_225, 58_448],
    [640_600, 192_979.25],
  ],
  married_separate: [
    [12_400, 1_240],
    [50_400, 5_800],
    [105_700, 17_966],
    [201_775, 41_024],
    [256_225, 58_448],
    [384_350, 103_291.75],
  ],
};

describe('incomeTax', () => {
  for (const [status, rows] of Object.entries(IRS_TAX_AT_BRACKET_START)) {
    it.each(rows)(`${status}: taxable $%d owes the IRS's $%d`, (taxable, owed) => {
      expect(incomeTax(taxable, TABLE_2026.brackets[status as FilingStatus])).toBeCloseTo(owed, 6);
    });
  }

  it('is zero at or below zero taxable income', () => {
    expect(incomeTax(0, TABLE_2026.brackets.single)).toBe(0);
    expect(incomeTax(-5_000, TABLE_2026.brackets.single)).toBe(0);
  });

  it('taxes the top bracket at 37%', () => {
    expect(incomeTax(740_600, TABLE_2026.brackets.single)).toBeCloseTo(192_979.25 + 37_000, 6);
  });
});

describe('annualBreakdown', () => {
  it('matches the wireframe example: $75,000, single, state 5%', () => {
    const a = annualBreakdown(inputs({ stateRate: 0.05 }), TABLE_2026);
    expect(a.federal).toBeCloseTo(7_670, 6);
    expect(a.socialSecurity).toBeCloseTo(4_650, 6);
    expect(a.medicare).toBeCloseTo(1_087.5, 6);
    expect(a.state).toBeCloseTo(3_750, 6);
    expect(a.you).toBeCloseTo(57_842.5, 6);
  });

  it.each([
    [184_499, 184_499 * 0.062],
    [184_500, 11_439],
    [184_501, 11_439],
  ])('Social Security on $%d is capped at the wage base: $%d', (salary, ss) => {
    expect(annualBreakdown(inputs({ salary }), TABLE_2026).socialSecurity).toBeCloseTo(ss, 6);
  });

  it.each([
    ['single', 199_999, 199_999 * 0.0145],
    ['single', 200_000, 2_900],
    ['single', 200_001, 200_001 * 0.0145 + 0.009],
    ['married_joint', 250_000, 3_625],
    ['married_joint', 260_000, 260_000 * 0.0145 + 90],
    ['married_separate', 135_000, 135_000 * 0.0145 + 90],
    ['head_of_household', 210_000, 210_000 * 0.0145 + 90],
  ] as const)('Additional Medicare for %s on $%d: $%d', (filingStatus, salary, medicare) => {
    expect(annualBreakdown(inputs({ salary, filingStatus }), TABLE_2026).medicare).toBeCloseTo(medicare, 6);
  });

  it('uses each filing status’s standard deduction', () => {
    const a = annualBreakdown(inputs({ salary: 100_000, filingStatus: 'married_joint' }), TABLE_2026);
    // Taxable 67,800: 10% of 24,800 + 12% of 43,000.
    expect(a.federal).toBeCloseTo(2_480 + 5_160, 6);
  });

  it('replaces a calculation with a typed rate, with no cap', () => {
    const a = annualBreakdown(
      inputs({ salary: 300_000, overrides: { federal: 0.2, socialSecurity: 0.05, medicare: 0.01 } }),
      TABLE_2026,
    );
    expect(a.federal).toBeCloseTo(60_000, 6);
    expect(a.socialSecurity).toBeCloseTo(15_000, 6);
    expect(a.medicare).toBeCloseTo(3_000, 6);
  });

  it('is all zeros on no salary', () => {
    expect(annualBreakdown(inputs({ salary: 0, stateRate: 0.05 }), TABLE_2026)).toEqual({
      you: 0,
      federal: 0,
      socialSecurity: 0,
      state: 0,
      medicare: 0,
    });
  });
});
