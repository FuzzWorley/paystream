export const FILING_STATUSES = ['single', 'married_joint', 'married_separate', 'head_of_household'] as const;
export type FilingStatus = (typeof FILING_STATUSES)[number];

export const TAXES = ['federal', 'socialSecurity', 'state', 'medicare'] as const;
export type Tax = (typeof TAXES)[number];

/** Take-home first, then each tax: the order every screen lists them in. */
export const STREAMS = ['you', ...TAXES] as const;
export type Stream = (typeof STREAMS)[number];

/** A flat share of salary typed by the user, replacing the calculation. State is always typed. */
export type Overrides = Partial<Record<Exclude<Tax, 'state'>, number>>;

/** Validated before it reaches core: salary ≥ 0, every rate a fraction in [0, 1]. */
export interface TaxInputs {
  salary: number;
  filingStatus: FilingStatus;
  stateRate: number;
  overrides: Overrides;
}

export type Clock = { kind: 'around' } | { kind: 'work'; hoursPerWeek: number; weeksPerYear: number };

export type PerStream = Record<Stream, number>;

/** A rate and the taxable income at which it starts. The first `from` is always 0. */
export interface Bracket {
  from: number;
  rate: number;
}

export interface Source {
  what: string;
  url: string;
  where: string;
}

export interface TaxTable {
  taxYear: number;
  sources: readonly Source[];
  /** Ticked off by the owner against `sources` (D8). Nothing deploys without one. */
  confirmed: boolean;
  brackets: Record<FilingStatus, readonly Bracket[]>;
  standardDeduction: Record<FilingStatus, number>;
  socialSecurity: { rate: number; wageBase: number };
  medicare: { rate: number; additionalRate: number; additionalThreshold: Record<FilingStatus, number> };
}
