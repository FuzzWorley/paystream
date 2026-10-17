// The one animation loop. `now` changes once a frame while the page is visible; everything
// shown is derived from it, so pausing loses nothing and resuming jumps straight to the truth.
import { signal } from '@preact/signals';

export const now = signal(Date.now());

let frame = 0;
const tick = () => {
  now.value = Date.now();
  frame = requestAnimationFrame(tick);
};

export function startClock(): () => void {
  const onVisibility = () => {
    cancelAnimationFrame(frame);
    if (document.visibilityState === 'visible') tick();
  };
  document.addEventListener('visibilitychange', onVisibility);
  onVisibility();
  return () => {
    cancelAnimationFrame(frame);
    document.removeEventListener('visibilitychange', onVisibility);
  };
}
