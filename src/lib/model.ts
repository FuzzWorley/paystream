// Everything a screen shows about the streams, derived from settings and the clock. Skins and
// shared screens read these signals; none of them does tax maths.
import { computed } from '@preact/signals';
import {
  cadence,
  COINS,
  timeToEarn,
  unitSeconds,
  type Cadence,
  type Coin,
  type TimeUnit,
} from '../core/cadence';
import { calendarYear, earnedBetween, earningSeconds, rateAt, socialSecurityStops } from '../core/stream';
import { tableFor } from '../core/tables';
import { annualBreakdown } from '../core/tax';
import { STREAMS, type Clock, type PerStream, type Stream } from '../core/types';
import { now } from './clock';
import { formatAmount, formatCoin, formatDate, formatDuration } from './format';
import { settings, taxInputs } from './settings';

export const STREAM_LABELS: Record<Stream, string> = {
  you: 'You',
  federal: 'Federal',
  socialSecurity: 'Social Security',
  state: 'State',
  medicare: 'Medicare',
};

/** A river lane: one stream, or every tax as one when combined (D18). */
export type LaneId = Stream | 'taxes';

export interface StreamView {
  stream: LaneId;
  label: string;
  /** Per second, right now. */
  rate: number;
  /** Since the page opened. */
  earned: number;
  /** Whole coins arrived since the page opened: a lane's total ticks as each drop lands (D19). */
  landed: number;
  cadence: Cadence | null;
  /** Share of the way to this stream's next coin, 0–1. */
  progress: number;
  /** Seconds to the next coin; Infinity when stopped. */
  nextIn: number;
  /** In the chosen unit: "10¢ every 5.9 s" (D17). */
  unitText: string;
  /** Over the chosen time frame: "$61 every hour" (D17). */
  timeText: string;
  /** The time frame amount, compact for lanes: "$61 / hour". */
  timeShort: string;
  /** Its parts, for a skin that sets them its own way: "$61" and "working hour". */
  timeAmount: string;
  timeLabel: string;
  /**
   * flowing; dry (nothing flows, on purpose: past the wage cap, no state tax); or unset
   * (waiting for the user's state rate).
   */
  kind: 'flowing' | 'dry' | 'unset';
  /** A few words for a stream that isn't flowing: "capped Sep 27", "no state income tax". */
  status: string;
}

const inputs = computed(() => taxInputs(settings.value));
const clock = computed(() => settings.value.clock);
export const table = computed(() => tableFor(calendarYear(now.value).year));

const openedAt = Date.now();

/** Seconds since the page opened, hidden time included: the money kept arriving. */
export const secondsHere = computed(() => (now.value - openedAt) / 1000);

// "Since you got here" is always today's settings over the whole visit, so flipping 24 h / At
// work (or changing the salary) shows that version of the same minutes, matching the time shown.
const earned = computed(() => earnedBetween(inputs.value, table.value, clock.value, openedAt, now.value));

const rates = computed(() => rateAt(inputs.value, table.value, clock.value, now.value));

/** "every working hour": the span in words, saying working time on the work clock. */
function timeWord(unit: TimeUnit, c: Clock): string {
  if (c.kind === 'work' && unit === 'hour') return 'working hour';
  if (c.kind === 'work' && unit === 'day') return 'workday';
  if (c.kind === 'work' && unit === 'week') return 'working week';
  return unit;
}

/** Seconds of earning in a year on this clock, for months and years. */
const earningYear = computed(() => earningSeconds(clock.value, calendarYear(now.value)));
const secondsIn = (unit: TimeUnit) => unitSeconds(unit, clock.value, earningYear.value);

/** One coin for every stream (D16): the chosen one, or take-home's readable coin on auto. */
export const coin = computed<Coin>(() => {
  const choice = settings.value.coin;
  return choice !== 'auto' ? choice : (cadence(rates.value.you)?.coin ?? COINS[0]);
});

export const ssStopsAt = computed(() => socialSecurityStops(inputs.value, table.value, now.value));

/** When Social Security reached the wage cap this year, if it already has. */
export const ssCappedOn = computed(() => {
  const stop = ssStopsAt.value;
  return stop !== null && now.value >= stop ? stop : null;
});

/** Why a stream has nothing flowing, short and long. */
function stillness(stream: LaneId): { kind: 'dry' | 'unset'; status: string; why: string } {
  const stop = ssStopsAt.value;
  if (stream === 'socialSecurity' && stop !== null && now.value >= stop) {
    return {
      kind: 'dry',
      status: `capped ${formatDate(stop)}`,
      why: `Social Security reached its ${String(table.value.taxYear)} wage cap on ${formatDate(stop)}; it starts again on Jan 1`,
    };
  }
  if (stream === 'state' && settings.value.stateRate === null) {
    return { kind: 'unset', status: 'not set', why: 'Add your state income tax rate' };
  }
  if (stream === 'state' && settings.value.stateRate === 0) {
    return { kind: 'dry', status: 'no state income tax', why: 'No state income tax' };
  }
  if (stream === 'you' && inputs.value.salary > 0) {
    return { kind: 'dry', status: 'none', why: 'Your rates leave nothing to take home' };
  }
  return { kind: 'dry', status: 'none', why: stream === 'you' ? 'Nothing arriving' : 'Nothing to pay' };
}

/** "$61 every hour" and "$61 / hour", over the chosen time frame (D17). */
function timeTexts(rate: number): { long: string; short: string; amount: string; word: string } {
  const unit = settings.value.timeUnit;
  const amount = formatAmount(rate * secondsIn(unit));
  const word = timeWord(unit, clock.value);
  return { long: `${amount} every ${word}`, short: `${amount} / ${word}`, amount, word };
}

function view(stream: LaneId, label: string, rate: number, got: number): StreamView {
  const c = cadence(rate, coin.value);
  const coins = c ? got / c.coin : 0;
  // One count drives both the drops and the total, so the total ticks as a drop lands.
  const whole = Math.floor(coins);
  const progress = coins - whole;
  const still = c ? null : stillness(stream);
  const time = timeTexts(rate);
  return {
    stream,
    label,
    rate,
    earned: got,
    landed: c ? whole * c.coin : 0,
    cadence: c,
    progress,
    nextIn: c ? (1 - progress) * c.every : Infinity,
    unitText: c ? `${formatCoin(c.coin)} every ${formatDuration(c.every) ?? ''}` : (still?.why ?? ''),
    timeText: c ? time.long : (still?.why ?? ''),
    timeShort: c ? time.short : (still?.status ?? ''),
    timeAmount: time.amount,
    timeLabel: time.word,
    kind: still?.kind ?? 'flowing',
    status: still?.status ?? '',
  };
}

export const views = computed<StreamView[]>(() =>
  STREAMS.map((stream) => view(stream, STREAM_LABELS[stream], rates.value[stream], earned.value[stream])),
);

const TAX_STREAMS = STREAMS.filter((s) => s !== 'you');
const allTaxes = (per: PerStream) => TAX_STREAMS.reduce((sum, s) => sum + per[s], 0);

/**
 * What a river draws: only streams with money moving (D15), and the taxes as one lane when
 * combined (D18). The combined lane counts in the same coin, so its drops compare with yours.
 */
export const lanes = computed<StreamView[]>(() => {
  const moving = views.value.filter((v) => v.kind === 'flowing');
  if (!settings.value.combineTaxes) return moving;
  const taxes = view('taxes', 'Taxes', allTaxes(rates.value), allTaxes(earned.value));
  return [...moving.filter((v) => v.stream === 'you'), ...(taxes.kind === 'flowing' ? [taxes] : [])];
});

export const isExample = computed(() => settings.value.salary === null);

/** Yearly figures; recomputed when inputs change, not per frame. */
export const annual = computed(() => annualBreakdown(inputs.value, table.value));

/** Typed rates that leave nothing for take-home: the You stream stops, and Numbers says why. */
export const overTaxed = computed(() => inputs.value.salary > 0 && annual.value.you < 0);

function sharesOf(year: PerStream, salary: number): PerStream {
  const share = (s: Stream) => (salary > 0 ? year[s] / salary : 0);
  return {
    you: share('you'),
    federal: share('federal'),
    socialSecurity: share('socialSecurity'),
    state: share('state'),
    medicare: share('medicare'),
  };
}

/** Each stream's share of salary over the year: "9.8%" beside its yearly figure. */
export const shares = computed(() => sharesOf(annual.value, inputs.value.salary));

export type WageCap =
  | { kind: 'override' }
  | { kind: 'never'; wageBase: number }
  | { kind: 'upcoming' | 'reached'; on: number; wageBase: number };

/** Where Social Security stands against this year's wage cap (D11). Not per frame: no `now`. */
export const wageCap = computed<WageCap>(() => {
  const wageBase = table.value.socialSecurity.wageBase;
  if (inputs.value.overrides.socialSecurity !== undefined) return { kind: 'override' };
  const on = ssStopsAt.value;
  if (on === null) return { kind: 'never', wageBase };
  return { kind: ssCappedOn.value !== null ? 'reached' : 'upcoming', on, wageBase };
});

/** Take-home per second, never negative. A number, so readers re-render only when it changes. */
export const youRate = computed(() => Math.max(0, rates.value.you));

export interface ThingView {
  name: string;
  amount: number;
  /** "12 min": how long take-home takes to earn it at today's rate; null when nothing arrives. */
  every: string | null;
}

/** Your things (D6), priced in take-home time. */
export const thingViews = computed<ThingView[]>(() =>
  settings.value.things.map((t) => ({
    name: t.name.trim() || 'Something',
    amount: t.amount,
    every: takeHomeTime(t.amount),
  })),
);

/** "12 min": how long take-home takes to earn `amount` right now; null when nothing arrives. */
export function takeHomeTime(amount: number): string | null {
  return formatDuration(timeToEarn(amount, youRate.value));
}

/** Each tax's share as the 2026 tables work it out, ignoring any typed rate: the placeholder. */
export const calculatedShares = computed(() =>
  sharesOf(annualBreakdown({ ...inputs.value, overrides: {} }, table.value), inputs.value.salary),
);
