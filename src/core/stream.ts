// How each stream flows over time (D11). Every amount is a closed-form function of the
// inputs and two instants; nothing accumulates. Instants are epoch milliseconds.
import { annualBreakdown } from './tax';
import { STREAMS, type Clock, type PerStream, type TaxInputs, type TaxTable } from './types';

const zero = (): PerStream => ({ you: 0, federal: 0, socialSecurity: 0, state: 0, medicare: 0 });

/** The local calendar year containing `t`, as [start, end). */
export function calendarYear(t: number): { year: number; start: number; end: number } {
  const year = new Date(t).getFullYear();
  return { year, start: new Date(year, 0, 1).getTime(), end: new Date(year + 1, 0, 1).getTime() };
}

/** Seconds of earning in a year: every second, or only working ones. */
export function earningSeconds(clock: Clock, year: { start: number; end: number }): number {
  return clock.kind === 'around'
    ? (year.end - year.start) / 1000
    : clock.hoursPerWeek * clock.weeksPerYear * 3600;
}

/**
 * The instants in `year` at which wages to date (salary × share of the calendar year gone)
 * reach a threshold — where Social Security stops and Additional Medicare starts.
 */
function thresholdCrossings(inputs: TaxInputs, table: TaxTable, year: { start: number; end: number }) {
  const at = (amount: number) =>
    amount < inputs.salary ? year.start + (amount / inputs.salary) * (year.end - year.start) : Infinity;
  return {
    wageBase: at(table.socialSecurity.wageBase),
    additionalMedicare: at(table.medicare.additionalThreshold[inputs.filingStatus]),
  };
}

/** Per-second rate of each stream at instant `t`, on `clock`. */
export function rateAt(inputs: TaxInputs, table: TaxTable, clock: Clock, t: number): PerStream {
  const year = calendarYear(t);
  const seconds = earningSeconds(clock, year);
  const annual = annualBreakdown(inputs, table);
  const gross = inputs.salary / seconds;
  const { overrides } = inputs;
  const crossed = thresholdCrossings(inputs, table, year);

  const federal = annual.federal / seconds;
  const state = annual.state / seconds;
  const socialSecurity =
    overrides.socialSecurity !== undefined
      ? annual.socialSecurity / seconds
      : t < crossed.wageBase
        ? table.socialSecurity.rate * gross
        : 0;
  const medicare =
    overrides.medicare !== undefined
      ? annual.medicare / seconds
      : table.medicare.rate * gross +
        (t >= crossed.additionalMedicare ? table.medicare.additionalRate * gross : 0);

  return {
    you: gross - federal - socialSecurity - state - medicare,
    federal,
    socialSecurity,
    state,
    medicare,
  };
}

/** What each stream earned between `t0` and `t1`, exactly: rates are constant between breakpoints. */
export function earnedBetween(
  inputs: TaxInputs,
  table: TaxTable,
  clock: Clock,
  t0: number,
  t1: number,
): PerStream {
  const total = zero();
  let from = t0;
  while (from < t1) {
    const year = calendarYear(from);
    const crossed = thresholdCrossings(inputs, table, year);
    const to = Math.min(
      t1,
      year.end,
      ...[crossed.wageBase, crossed.additionalMedicare].filter((c) => c > from),
    );
    const rate = rateAt(inputs, table, clock, from);
    for (const s of STREAMS) total[s] += (rate[s] * (to - from)) / 1000;
    from = to;
  }
  return total;
}

/** Seconds until a stream that has `earned` so far reaches its next whole `coin`. */
export function nextCoinIn(earned: number, ratePerSecond: number, coin: number): number {
  if (ratePerSecond <= 0) return Infinity;
  const coins = earned / coin;
  return ((Math.floor(coins) + 1 - coins) * coin) / ratePerSecond;
}

/** When Social Security stops this year, or null if the salary never reaches the wage base. */
export function socialSecurityStops(inputs: TaxInputs, table: TaxTable, t: number): number | null {
  if (inputs.overrides.socialSecurity !== undefined) return null;
  const stop = thresholdCrossings(inputs, table, calendarYear(t)).wageBase;
  return stop === Infinity ? null : stop;
}
