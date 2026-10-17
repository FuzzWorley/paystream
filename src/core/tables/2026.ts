import type { Bracket, TaxTable } from '../types';

const RP_25_32 = 'https://www.irs.gov/pub/irs-drop/rp-25-32.pdf';

// Seven rates need exactly seven starting points; a miscounted row won't compile.
type Starts = readonly [number, number, number, number, number, number, number];
const brackets = ([a, b, c, d, e, f, g]: Starts): Bracket[] => [
  { from: a, rate: 0.1 },
  { from: b, rate: 0.12 },
  { from: c, rate: 0.22 },
  { from: d, rate: 0.24 },
  { from: e, rate: 0.32 },
  { from: f, rate: 0.35 },
  { from: g, rate: 0.37 },
];

/** Transcribed from the documents in `sources`, fetched 2026-10-17; confirmed by the owner 2026-10-17. */
export const TABLE_2026: TaxTable = {
  taxYear: 2026,
  confirmed: true,
  sources: [
    {
      what: 'Income tax brackets',
      url: RP_25_32,
      where: 'Rev. Proc. 2025-32 §4.01, Tables 1–4, PDF pp. 10–12',
    },
    { what: 'Standard deduction', url: RP_25_32, where: 'Rev. Proc. 2025-32 §4.14(1), PDF p. 18' },
    {
      what: 'Social Security and Medicare rates, wage base',
      url: 'https://www.irs.gov/pub/irs-pdf/p15.pdf',
      where: 'Publication 15 (2026), section 9, "Social Security and Medicare Taxes", PDF p. 29',
    },
    {
      what: 'Additional Medicare Tax thresholds',
      url: 'https://www.irs.gov/taxtopics/tc560',
      where: 'Topic no. 560, Additional Medicare Tax',
    },
  ],
  brackets: {
    single: brackets([0, 12_400, 50_400, 105_700, 201_775, 256_225, 640_600]),
    married_joint: brackets([0, 24_800, 100_800, 211_400, 403_550, 512_450, 768_700]),
    married_separate: brackets([0, 12_400, 50_400, 105_700, 201_775, 256_225, 384_350]),
    head_of_household: brackets([0, 17_700, 67_450, 105_700, 201_750, 256_200, 640_600]),
  },
  standardDeduction: {
    single: 16_100,
    married_joint: 32_200,
    married_separate: 16_100,
    head_of_household: 24_150,
  },
  socialSecurity: { rate: 0.062, wageBase: 184_500 },
  medicare: {
    rate: 0.0145,
    additionalRate: 0.009,
    additionalThreshold: {
      single: 200_000,
      married_joint: 250_000,
      married_separate: 125_000,
      head_of_household: 200_000,
    },
  },
};
