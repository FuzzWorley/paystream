// Seeded randomness shared by the games: the same seed always plays the same round, so a
// sweep can prove a game's odds honest.

/** A small, fast, seedable generator (mulberry32) returning [0, 1). */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** One of `items`, each chosen with probability its weight over the total; undefined if all are 0. */
export function pickWeighted<T extends { weight: number }>(
  items: readonly T[],
  random: () => number,
): T | undefined {
  const total = items.reduce((sum, i) => sum + Math.max(0, i.weight), 0);
  if (!(total > 0)) return undefined;
  let left = random() * total;
  for (const item of items) {
    left -= Math.max(0, item.weight);
    if (left < 0) return item;
  }
  return items.findLast((i) => i.weight > 0);
}
