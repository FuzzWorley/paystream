// Best scores, kept in this browser only (D28). Validated on load like settings: a corrupt or
// older save is ignored, never trusted.
import { signal } from '@preact/signals';

export interface Best {
  /** Points above the real take-home share: kept share minus fair share, e.g. 0.14. */
  beat: number;
  /** The share kept in that round. */
  kept: number;
  /** When, as epoch ms. */
  at: number;
}

const KEY = 'paystream:scores';

function parse(raw: unknown): Record<string, Best> {
  if (typeof raw !== 'object' || raw === null) return {};
  const out: Record<string, Best> = {};
  for (const [game, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v !== 'object' || v === null) continue;
    const { beat, kept, at } = v as Record<string, unknown>;
    if (
      typeof beat === 'number' &&
      typeof kept === 'number' &&
      typeof at === 'number' &&
      [beat, kept, at].every(Number.isFinite) &&
      Math.abs(beat) <= 1 &&
      kept >= 0 &&
      kept <= 1
    ) {
      out[game] = { beat, kept, at };
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
export function recordRound(game: string, round: Best): boolean {
  const old = bests.value[game];
  if (old && old.beat >= round.beat) return false;
  bests.value = { ...bests.value, [game]: round };
  try {
    localStorage.setItem(KEY, JSON.stringify(bests.value));
  } catch {
    // Not saved; the best still shows for this visit.
  }
  return true;
}

export { parse as parseScores };
