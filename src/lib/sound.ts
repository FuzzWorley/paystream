// A coin sound each time a coin reaches you, in the active skin's voice. Off by default; the
// audio context is created only once sound is switched on.
import { computed, effect } from '@preact/signals';
import { views } from './model';
import { settings } from './settings';

type Voice = (ctx: AudioContext, at: number) => void;

/** Faster than this and the clinks blur into a buzz; skip some instead. */
const MIN_GAP_S = 0.09;

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  try {
    ctx ??= new AudioContext();
  } catch {
    return null;
  }
  if (ctx.state === 'suspended') void ctx.resume().catch(() => undefined);
  return ctx;
}

// Primitives, so the effect below runs once per landing coin, not once per frame.
const youLanded = computed(() => views.value[0]?.landed ?? 0);
const youCoin = computed(() => views.value[0]?.cadence?.coin ?? 0);

export function startCoinSounds(voice: () => Voice): void {
  // Browsers allow audio only after a tap. Switching sound on is one; after a reload, the first
  // tap anywhere on the page is.
  effect(() => {
    if (settings.value.sound) audio();
  });
  addEventListener(
    'pointerdown',
    () => {
      if (settings.peek().sound) audio();
    },
    { passive: true },
  );

  let last = { landed: youLanded.peek(), coin: youCoin.peek(), at: 0 };
  effect(() => {
    const landed = youLanded.value;
    const coin = youCoin.value;
    // A new coin size or salary restarts the count; only a coin arriving makes a sound.
    const arrived = coin === last.coin && landed > last.landed && landed - last.landed <= coin * 3;
    if (arrived && settings.peek().sound && ctx?.state === 'running' && !document.hidden) {
      if (ctx.currentTime - last.at >= MIN_GAP_S) {
        voice()(ctx, ctx.currentTime);
        last.at = ctx.currentTime;
      }
    }
    last = { landed, coin, at: last.at };
  });
}
