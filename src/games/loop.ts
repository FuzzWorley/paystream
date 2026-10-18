/**
 * A game's frame loop: calls `frame(dt)` each animation frame while it returns true, pauses
 * while the tab is hidden or the window loses focus, and keeps the canvas sharp on resize.
 * `dt` is capped, so a long pause never arrives as one giant step.
 */
export function startLoop(
  canvas: HTMLCanvasElement,
  aspect: number,
  frame: (dt: number) => boolean,
): { wake: () => void; stop: () => void } {
  let raf = 0;
  let last = 0;
  let paused = false;

  const resize = () => {
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.round(canvas.clientWidth * ratio);
    canvas.height = Math.round(canvas.clientWidth * aspect * ratio);
    // Resizing clears a canvas; redraw now, even while paused, with no time passing.
    frame(0);
  };
  const tick = (now: number) => {
    const dt = Math.min(0.05, last ? (now - last) / 1000 : 0);
    last = now;
    raf = frame(dt) ? requestAnimationFrame(tick) : 0;
  };
  const wake = () => {
    if (raf || paused) return;
    last = 0;
    raf = requestAnimationFrame(tick);
  };
  const pause = () => {
    paused = true;
    cancelAnimationFrame(raf);
    raf = 0;
  };
  const resume = () => {
    paused = false;
    wake();
  };
  const onVisibility = () => {
    if (document.hidden) pause();
    else resume();
  };

  resize();
  window.addEventListener('resize', resize);
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('blur', pause);
  window.addEventListener('focus', resume);
  wake();

  return {
    wake,
    stop: () => {
      pause();
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', pause);
      window.removeEventListener('focus', resume);
    },
  };
}
