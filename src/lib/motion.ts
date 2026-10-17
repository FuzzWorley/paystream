import { signal } from '@preact/signals';

const query = window.matchMedia('(prefers-reduced-motion: reduce)');

/** True when the user asked for less motion: numbers still tick, nothing travels. */
export const reducedMotion = signal(query.matches);
query.addEventListener('change', (e) => {
  reducedMotion.value = e.matches;
});
