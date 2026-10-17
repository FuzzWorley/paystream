// The one formatter for every amount and unit shown. No inline toFixed elsewhere.

// Formatting -0 prints "-0"; anything that rounds to zero shows as zero.
const unsign = (n: number) => (Object.is(n, -0) ? 0 : n);

const usdFormats = new Map<number, Intl.NumberFormat>();
function usdFormat(decimals: number) {
  let f = usdFormats.get(decimals);
  if (!f) {
    f = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
    usdFormats.set(decimals, f);
  }
  return f;
}

/** "$57,842.50"; `decimals` 4 for the slow-moving "since you got here" totals. */
export function formatUsd(amount: number, decimals = 2): string {
  const f = usdFormat(decimals);
  const rounded = Number(amount.toFixed(decimals));
  return f.format(unsign(rounded));
}

/** "1¢", "10¢", "$1", "$100". */
export function formatCoin(dollars: number): string {
  return dollars < 1 ? `${String(Math.round(dollars * 100))}¢` : usdFormat(0).format(dollars);
}

/** "62.5%", "6.2%", "0.9%". */
export function formatPercent(fraction: number): string {
  return `${String(unsign(Number((fraction * 100).toFixed(2))))}%`;
}

// Each unit is used while its rounded figure stays under `upTo`, so 99.7 s reads "1.7 min",
// never "100 s".
const UNITS = [
  { size: 1, label: 's', upTo: 100 },
  { size: 60, label: 'min', upTo: 100 },
  { size: 3600, label: 'h', upTo: 48 },
] as const;

/** One decimal under ten, whole numbers above: "4.2", "36". */
function figure(n: number): string {
  return Number(n.toFixed(1)) < 10 ? n.toFixed(1) : String(Math.round(n));
}

/**
 * "4.2 s", "36 min", "2.3 h", "9.4 days": the unit that keeps the figure readable. Null for a
 * stream that never arrives.
 */
export function formatDuration(seconds: number): string | null {
  if (!Number.isFinite(seconds) || seconds < 0) return null;
  for (const u of UNITS) {
    if (Math.round(seconds / u.size) < u.upTo) return `${figure(seconds / u.size)} ${u.label}`;
  }
  return `${figure(seconds / 86_400)} days`;
}
