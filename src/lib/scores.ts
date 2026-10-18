// Best scores, kept in this browser only (D28). Validated on load like settings: a corrupt or
// older save is ignored, never trusted. Each game decides what its number means; higher wins.
import { signal } from '@preact/signals';

export interface Best {
  /** The game's score: points above the real split, coins eaten… Higher is better. */
  value: number;
  /** When, as epoch ms. */
  at: number;
}

const KEY = 'paystream:scores';
const LIMIT = 1e9;

function parse(raw: unknown): Record<string, Best> {
  if (typeof raw !== 'object' || raw === null) return {};
  const out: Record<string, Best> = {};
  for (const [game, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v !== 'object' || v === null) continue;
    const { value, at } = v as Record<string, unknown>;
    if (
      typeof value === 'number' &&
      typeof at === 'number' &&
      Number.isFinite(value) &&
      Number.isFinite(at) &&
      Math.abs(value) <= LIMIT
    ) {
      out[game] = { value, at };
    }
  }
  return out;
}

function load(): Record<string, Best> {
  try {
    const saved = localStorage.getItem(KEY);
    return saved ? parse(JSON.parse(saved)) : {};
  } catch {
    return {};
  }
}

export const bests = signal<Record<string, Best>>(load());

/** Records a round; returns true when it is a new best for that game. */
export function recordRound(game: string, value: number): boolean {
  const old = bests.value[game];
  if (old && old.value >= value) return false;
  bests.value = { ...bests.value, [game]: { value, at: Date.now() } };
  try {
    localStorage.setItem(KEY, JSON.stringify(bests.value));
  } catch {
    // Not saved; the best still shows for this visit.
  }
  return true;
}

export { parse as parseScores };
