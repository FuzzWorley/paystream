import type { Bracket, PerStream, TaxInputs, TaxTable } from './types';

/** Tax on `taxable` income through progressive brackets. */
export function incomeTax(taxable: number, brackets: readonly Bracket[]): number {
  let tax = 0;
  brackets.forEach((b, i) => {
    const top = brackets[i + 1]?.from ?? Infinity;
    if (taxable > b.from) tax += (Math.min(taxable, top) - b.from) * b.rate;
  });
  return tax;
}

/** What each stream comes to over the year. Take-home is whatever the taxes leave. */
export function annualBreakdown(inputs: TaxInputs, table: TaxTable): PerStream {
  const { salary, filingStatus, stateRate, overrides } = inputs;
  const { socialSecurity: ss, medicare: med } = table;

  const federal =
    overrides.federal !== undefined
      ? overrides.federal * salary
      : incomeTax(salary - table.standardDeduction[filingStatus], table.brackets[filingStatus]);
  const socialSecurity =
    overrides.socialSecurity !== undefined
      ? overrides.socialSecurity * salary
      : ss.rate * Math.min(salary, ss.wageBase);
  const medicare =
    overrides.medicare !== undefined
      ? overrides.medicare * salary
      : med.rate * salary + med.additionalRate * Math.max(0, salary - med.additionalThreshold[filingStatus]);
  const state = stateRate * salary;

  return {
    you: salary - federal - socialSecurity - state - medicare,
    federal,
    socialSecurity,
    state,
    medicare,
  };
}
