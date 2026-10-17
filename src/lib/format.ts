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

/**
 * An amount that picks its own unit (D14): "11¢" under a dollar, "$6.60" up to $1,000,
 * "$1,240" above. Sub-cent amounts keep one decimal ("0.4¢") so a slow stream isn't "0¢".
 */
export function formatAmount(dollars: number): string {
  const cents = dollars * 100;
  if (Number(cents.toFixed(1)) < 1) return `${String(unsign(Number(cents.toFixed(1))))}¢`;
  if (Math.round(cents) < 100) return `${String(Math.round(cents))}¢`;
  return formatUsd(dollars, dollars < 1000 ? 2 : 0);
}

const grouped = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

/** "75,000": a whole number with thousands separators, for the salary field. */
export function formatDigits(n: number): string {
  return grouped.format(n);
}

/** "1¢", "10¢", "$1", "$100". */
export function formatCoin(dollars: number): string {
  return dollars < 1 ? `${String(Math.round(dollars * 100))}¢` : usdFormat(0).format(dollars);
}

/** "62.5%", "6.2%", "0.9%". */
export function formatPercent(fraction: number): string {
  return `${String(unsign(Number((fraction * 100).toFixed(2))))}%`;
}

const dateFormat = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });

/** "Aug 3", in local time. */
export function formatDate(t: number): string {
  return dateFormat.format(t);
}

/**
 * A ticking countdown: "2.3 s" under a minute, then "4m 12s", "2h 05m", "3d 4h". Null when
 * nothing is coming.
 */
export function formatCountdown(seconds: number): string | null {
  if (!Number.isFinite(seconds) || seconds < 0) return null;
  if (seconds < 59.95) return `${seconds.toFixed(1)} s`;
  const s = Math.round(seconds);
  const pad = (n: number) => String(n).padStart(2, '0');
  if (s < 3600) return `${String(Math.floor(s / 60))}m ${pad(s % 60)}s`;
  if (s < 86_400) return `${String(Math.floor(s / 3600))}h ${pad(Math.floor((s % 3600) / 60))}m`;
  return `${String(Math.floor(s / 86_400))}d ${String(Math.floor((s % 86_400) / 3600))}h`;
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
