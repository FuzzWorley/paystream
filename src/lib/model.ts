// Everything a screen shows about the streams, derived from settings and the clock. Skins and
// shared screens read these signals; none of them does tax maths.
import { computed, effect, signal } from '@preact/signals';
import {
  cadence,
  coinChoices,
  nextCoinChoice,
  RATE_UNITS,
  unitSeconds,
  type Cadence,
  type RateUnit,
} from '../core/cadence';
import { calendarYear, earnedBetween, rateAt, socialSecurityStops } from '../core/stream';
import { tableFor } from '../core/tables';
import { annualBreakdown } from '../core/tax';
import { STREAMS, type Clock, type PerStream, type Stream } from '../core/types';
import { now } from './clock';
import { formatAmount, formatCoin, formatDate, formatDuration } from './format';
import { settings, taxInputs, updateSettings } from './settings';

export const STREAM_LABELS: Record<Stream, string> = {
  you: 'You',
  federal: 'Federal',
  socialSecurity: 'Social Security',
  state: 'State',
  medicare: 'Medicare',
};

export interface StreamView {
  stream: Stream;
  label: string;
  /** Per second, right now. */
  rate: number;
  /** Since the page opened. */
  earned: number;
  cadence: Cadence | null;
  /** Share of the way to this stream's next coin, 0–1. */
  progress: number;
  /** Seconds to the next coin; Infinity when stopped. */
  nextIn: number;
  /** In the chosen unit, as a sentence for the hero: "1¢ every 5.5 s", "$6.60 an hour". */
  rateText: string;
  /** The same rate, compact for lanes and tables: "1¢ / 5.5 s", "$6.60 / hour". */
  rateShort: string;
  /** The penny view in parts, so the coin can be its own control: "10¢" and "5.9 s". */
  coinText: string;
  everyText: string;
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

// "Since you got here" banks each stretch when the inputs change, so a new salary doesn't
// rewrite what already arrived. Banking happens on input events, never per frame.
const bank = signal<PerStream>({ you: 0, federal: 0, socialSecurity: 0, state: 0, medicare: 0 });
const stretchStart = signal(Date.now());
let banked = { inputs: inputs.peek(), clock: clock.peek() };
effect(() => {
  const next = { inputs: inputs.value, clock: clock.value };
  if (next.inputs === banked.inputs && next.clock === banked.clock) return;
  const t = Date.now();
  const stretch = earnedBetween(banked.inputs, table.peek(), banked.clock, stretchStart.peek(), t);
  const total = { ...bank.peek() };
  for (const s of STREAMS) total[s] += stretch[s];
  bank.value = total;
  stretchStart.value = t;
  banked = next;
});

const earned = computed(() => {
  const stretch = earnedBetween(inputs.value, table.value, clock.value, stretchStart.value, now.value);
  const total = { ...bank.value };
  for (const s of STREAMS) total[s] += stretch[s];
  return total;
});

const rates = computed(() => rateAt(inputs.value, table.value, clock.value, now.value));

/** The unit as a sentence ("an hour") and compact ("hour"). */
function unitWords(unit: Exclude<RateUnit, 'penny'>, c: Clock): { long: string; short: string } {
  if (unit === 'minute') return { long: 'a minute', short: 'min' };
  if (unit === 'hour') {
    return c.kind === 'work'
      ? { long: 'a working hour', short: 'work hour' }
      : { long: 'an hour', short: 'hour' };
  }
  return c.kind === 'work' ? { long: 'a workday', short: 'workday' } : { long: 'a day', short: 'day' };
}

export const ssStopsAt = computed(() => socialSecurityStops(inputs.value, table.value, now.value));

/** When Social Security reached the wage cap this year, if it already has. */
export const ssCappedOn = computed(() => {
  const stop = ssStopsAt.value;
  return stop !== null && now.value >= stop ? stop : null;
});

/** Why a stream has nothing flowing, short and long. */
function stillness(stream: Stream): { kind: 'dry' | 'unset'; status: string; why: string } {
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
  return { kind: 'dry', status: 'none', why: stream === 'you' ? 'Nothing arriving' : 'Nothing to pay' };
}

/** "1¢ every 5.5 s" / "1¢ / 5.5 s", or "$6.60 an hour" / "$6.60 / hour", in the chosen unit (D14). */
function flowingText(c: Cadence, rate: number): { long: string; short: string } {
  const unit = settings.value.rateUnit;
  if (unit === 'penny') {
    const coin = formatCoin(c.coin);
    const every = formatDuration(c.every) ?? '';
    return { long: `${coin} every ${every}`, short: `${coin} / ${every}` };
  }
  const amount = formatAmount(rate * unitSeconds(unit, clock.value));
  const words = unitWords(unit, clock.value);
  return { long: `${amount} ${words.long}`, short: `${amount} / ${words.short}` };
}

export const views = computed<StreamView[]>(() =>
  STREAMS.map((stream) => {
    const rate = rates.value[stream];
    const got = earned.value[stream];
    const c = cadence(rate, settings.value.coin);
    const coins = c ? got / c.coin : 0;
    const progress = coins - Math.floor(coins);
    const still = c ? null : stillness(stream);
    const text = c ? flowingText(c, rate) : { long: still?.why ?? '', short: still?.status ?? '' };
    return {
      stream,
      label: STREAM_LABELS[stream],
      rate,
      earned: got,
      cadence: c,
      progress,
      nextIn: c ? (1 - progress) * c.every : Infinity,
      rateText: text.long,
      rateShort: text.short,
      coinText: c ? formatCoin(c.coin) : '',
      everyText: c ? (formatDuration(c.every) ?? '') : '',
      kind: still?.kind ?? 'flowing',
      status: still?.status ?? '',
    };
  }),
);

/** The streams with money moving: the only ones a river draws. */
export const flowing = computed(() => views.value.filter((v) => v.kind === 'flowing'));

export const isExample = computed(() => settings.value.salary === null);

/** Yearly figures; recomputed when inputs change, not per frame. */
export const annual = computed(() => annualBreakdown(inputs.value, table.value));

export function nextRateUnit(unit: RateUnit): RateUnit {
  return RATE_UNITS[(RATE_UNITS.indexOf(unit) + 1) % RATE_UNITS.length] ?? 'penny';
}

export function cycleRateUnit(): void {
  updateSettings({ rateUnit: nextRateUnit(settings.value.rateUnit) });
}

/** The coins worth offering at this salary: auto, then one coin for every stream. */
const coins = computed(() =>
  coinChoices(
    rates.value.you,
    STREAMS.flatMap((s) => cadence(rates.value[s])?.coin ?? []),
  ),
);

export function cycleCoin(): void {
  updateSettings({ coin: nextCoinChoice(settings.value.coin, coins.value) });
}
