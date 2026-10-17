// What the user has typed, saved in this browser only (rule 1). Loading validates field by
// field, so a corrupt or older save falls back to defaults instead of breaking the page.
import { signal } from '@preact/signals';
import { COINS, TIME_UNITS, type CoinChoice, type TimeUnit } from '../core/cadence';
import {
  FILING_STATUSES,
  type Clock,
  type FilingStatus,
  type Overrides,
  type TaxInputs,
} from '../core/types';

export interface Thing {
  name: string;
  amount: number;
}

export interface Settings {
  /** Null until typed; the screen then shows EXAMPLE_SALARY, marked as an example. */
  salary: number | null;
  filingStatus: FilingStatus;
  /** Null until the user answers; 0 means their state has no income tax. */
  stateRate: number | null;
  overrides: Overrides;
  clock: Clock;
  /** The unit money arrives in: dot size and "1¢ every 5.1 s" (D17). */
  coin: CoinChoice;
  /** The time frame amounts are shown over: "$7.03 every hour" (D17). */
  timeUnit: TimeUnit;
  /** Draw the taxes as one stream instead of one per tax (D18). */
  combineTaxes: boolean;
  things: Thing[];
  skin: string;
  sound: boolean;
}

export const EXAMPLE_SALARY = 75_000;
export const MAX_SALARY = 99_999_999;
const KEY = 'paystream:v1';

export const DEFAULTS: Settings = {
  salary: null,
  filingStatus: 'single',
  stateRate: null,
  overrides: {},
  clock: { kind: 'around' },
  coin: 'auto',
  timeUnit: 'hour',
  combineTaxes: false,
  things: [
    { name: 'A coffee', amount: 5 },
    { name: "A month's rent", amount: 1_500 },
  ],
  skin: 'river',
  sound: false,
};

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const num = (v: unknown, min: number, max: number): number | undefined =>
  typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max ? v : undefined;
const oneOf = <T extends string>(v: unknown, options: readonly T[]): T | undefined =>
  options.find((o) => o === v);

function parseClock(v: unknown): Clock | undefined {
  if (!isRecord(v)) return undefined;
  if (v.kind === 'around') return { kind: 'around' };
  const hoursPerWeek = num(v.hoursPerWeek, 1, 168);
  const weeksPerYear = num(v.weeksPerYear, 1, 52);
  return v.kind === 'work' && hoursPerWeek && weeksPerYear
    ? { kind: 'work', hoursPerWeek, weeksPerYear }
    : undefined;
}

function parseOverrides(v: unknown): Overrides {
  const out: Overrides = {};
  if (!isRecord(v)) return out;
  for (const key of ['federal', 'socialSecurity', 'medicare'] as const) {
    const rate = num(v[key], 0, 1);
    if (rate !== undefined) out[key] = rate;
  }
  return out;
}

function parseThings(v: unknown): Thing[] | undefined {
  if (!Array.isArray(v)) return undefined;
  return v.flatMap((t: unknown) => {
    if (!isRecord(t) || typeof t.name !== 'string') return [];
    const amount = num(t.amount, 0.01, MAX_SALARY);
    return amount ? [{ name: t.name.slice(0, 60), amount }] : [];
  });
}

export function parseSettings(raw: unknown): Settings {
  if (!isRecord(raw)) return DEFAULTS;
  return {
    salary: raw.salary === null ? null : (num(raw.salary, 0, MAX_SALARY) ?? DEFAULTS.salary),
    filingStatus: oneOf(raw.filingStatus, FILING_STATUSES) ?? DEFAULTS.filingStatus,
    stateRate: num(raw.stateRate, 0, 1) ?? null,
    overrides: parseOverrides(raw.overrides),
    clock: parseClock(raw.clock) ?? DEFAULTS.clock,
    coin: COINS.find((c) => c === raw.coin) ?? DEFAULTS.coin,
    timeUnit: oneOf(raw.timeUnit, TIME_UNITS) ?? DEFAULTS.timeUnit,
    combineTaxes: typeof raw.combineTaxes === 'boolean' ? raw.combineTaxes : DEFAULTS.combineTaxes,
    things: parseThings(raw.things) ?? DEFAULTS.things,
    skin: typeof raw.skin === 'string' ? raw.skin : DEFAULTS.skin,
    sound: typeof raw.sound === 'boolean' ? raw.sound : DEFAULTS.sound,
  };
}

/** The inputs core needs; an empty salary computes the example. */
export function taxInputs(s: Settings): TaxInputs {
  return {
    salary: s.salary ?? EXAMPLE_SALARY,
    filingStatus: s.filingStatus,
    stateRate: s.stateRate ?? 0,
    overrides: s.overrides,
  };
}

// Storage can throw (private windows, blocked site data); the page works without it.
function load(): Settings {
  try {
    const saved = localStorage.getItem(KEY);
    return saved ? parseSettings(JSON.parse(saved)) : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

export const settings = signal<Settings>(load());

let askedToPersist = false;

export function updateSettings(change: Partial<Settings>): void {
  settings.value = { ...settings.value, ...change };
  try {
    localStorage.setItem(KEY, JSON.stringify(settings.value));
  } catch {
    // Not saved; it still works for this visit.
  }
  // Ask once, after something worth keeping: Safari otherwise clears storage after ~7 days idle.
  if (!askedToPersist && settings.value.salary !== null) {
    askedToPersist = true;
    // Older browsers lack it; the types say it's always there.
    if ('storage' in navigator && 'persist' in navigator.storage) {
      void navigator.storage.persist().catch(() => false);
    }
  }
}
