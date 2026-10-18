// Paychinko on a canvas: the frame loop, drawing and input. Rules live in round.ts; the
// hosting screen hands in the split, the colours and callbacks, and owns the buttons and HUD.
import { BALL_R, BELT_TOP, BOARD, PEG_R, ROUND_SECONDS, aimAt, rng, type Bin } from './engine';
import { advance, fairShare, keptShare, newRound, release, startHold, useNudge, type Round } from './round';

export interface Palette {
  bg: string;
  surface: string;
  line: string;
  text: string;
  muted: string;
  /** By bin id. */
  bins: Record<string, string>;
  font: string;
}

export interface Hud {
  secondsLeft: number;
  kept: number;
  taxed: number;
  /** Share kept so far; null before anything lands. */
  keptShare: number | null;
  /** The share chance alone gives: your real take-home. */
  fairShare: number;
  nudgesLeft: number;
  over: boolean;
}

export interface Setup {
  bins: Bin[];
  /** Dollars per ball: a minute of gross pay. */
  ballValue: number;
  palette: Palette;
  /** Short names for the belt, by bin id. */
  names: Record<string, string>;
  /** Watch mode: drops land at random, untouched, to show the real split. */
  watch: boolean;
  reducedMotion: boolean;
  onHud: (hud: Hud) => void;
  /** Each landing, for sound. */
  onLand: (mine: boolean) => void;
}

export interface Controls {
  hold: () => void;
  release: () => void;
  nudge: (direction: 1 | -1) => void;
  restart: () => void;
  unmount: () => void;
}

interface Splash {
  x: number;
  text: string;
  color: string;
  age: number;
}

const SPLASH_SECONDS = 0.9;
const SHAKE_SECONDS = 0.18;

export function mount(canvas: HTMLCanvasElement, setup: Setup): Controls {
  const ctx = canvas.getContext('2d');
  const seedFrom = () => Math.floor(Math.random() * 2 ** 31);
  let round: Round = newRound(setup.bins, setup.ballValue, seedFrom(), Math.random());
  let splashes: Splash[] = [];
  let shake = 0;
  let frame = 0;
  let last = 0;
  let watchClock = 0;
  const watchRandom = rng(seedFrom());

  const resize = () => {
    const ratio = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(width * (BOARD.height / BOARD.width) * ratio);
  };

  const hud = (): Hud => ({
    secondsLeft: Math.max(0, ROUND_SECONDS - round.time),
    kept: round.kept,
    taxed: round.taxed,
    keptShare: keptShare(round),
    fairShare: fairShare(round),
    nudgesLeft: round.nudgesLeft,
    over: round.over,
  });

  const draw = () => {
    if (!ctx) return;
    const { palette } = setup;
    const scale = canvas.width / BOARD.width;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    if (shake > 0 && !setup.reducedMotion) ctx.translate((Math.random() - 0.5) * 4, 0);
    ctx.fillStyle = palette.bg;
    ctx.fillRect(-4, 0, BOARD.width + 8, BOARD.height);

    // The belt: bins at their real widths, scrolled by the phase and wrapped.
    const beltH = BOARD.height - BELT_TOP;
    let start = round.phase * BOARD.width;
    for (const bin of round.bins) {
      const w = bin.width * BOARD.width;
      const color = palette.bins[bin.id] ?? palette.muted;
      for (const shift of [-BOARD.width, 0]) {
        const x = start + shift;
        if (x + w < 0 || x > BOARD.width) continue;
        ctx.fillStyle = palette.surface;
        ctx.fillRect(x, BELT_TOP, w, beltH);
        ctx.fillStyle = color;
        ctx.fillRect(x, BELT_TOP, w, 4);
        const name = setup.names[bin.id] ?? bin.id;
        ctx.font = `10px ${palette.font}`;
        if (ctx.measureText(name).width + 6 < w) {
          ctx.fillStyle = color;
          ctx.textAlign = 'center';
          ctx.fillText(name, x + w / 2, BELT_TOP + 22);
        }
        // A 1px gap between bins, so neighbours stay apart.
        ctx.fillStyle = palette.bg;
        ctx.fillRect(x + w - 1, BELT_TOP, 1, beltH);
      }
      start = (start + w) % BOARD.width;
    }

    ctx.fillStyle = palette.muted;
    for (const p of round.pegs) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, PEG_R, 0, Math.PI * 2);
      ctx.fill();
    }

    // Where the next drop goes: the marker sweeps while held.
    if (!round.over && !setup.watch && round.time < ROUND_SECONDS) {
      const aim = BALL_R + aimAt(round.holding ?? 0) * (BOARD.width - 2 * BALL_R);
      ctx.globalAlpha = round.holding === null ? 0.35 : 1;
      ctx.fillStyle = palette.bins['you'] ?? palette.text;
      ctx.beginPath();
      ctx.moveTo(aim - 6, 4);
      ctx.lineTo(aim + 6, 4);
      ctx.lineTo(aim, 13);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    ctx.fillStyle = palette.bins['you'] ?? palette.text;
    for (const b of round.balls) {
      ctx.beginPath();
      ctx.arc(b.x, b.y, BALL_R, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.textAlign = 'center';
    ctx.font = `bold 11px ${palette.font}`;
    for (const s of splashes) {
      ctx.globalAlpha = Math.max(0, 1 - s.age / SPLASH_SECONDS);
      ctx.fillStyle = s.color;
      ctx.fillText(s.text, s.x, BELT_TOP - 8 - (setup.reducedMotion ? 0 : s.age * 24));
    }
    ctx.globalAlpha = 1;
  };

  const tick = (now: number) => {
    const dt = Math.min(0.05, last ? (now - last) / 1000 : 0);
    last = now;
    if (setup.watch && !round.over && round.time < ROUND_SECONDS) {
      // Left to chance: random aims at random moments, never nudged.
      watchClock -= dt;
      if (watchClock <= 0) {
        startHold(round);
        round.holding = watchRandom() * 2.8;
        release(round);
        watchClock = 0.35 + watchRandom() * 0.5;
      }
    }
    advance(round, dt);
    for (const landing of round.fresh) {
      const color = setup.palette.bins[landing.bin.id] ?? setup.palette.text;
      splashes.push({ x: landing.x, text: landing.bin.mine ? 'KEPT' : 'TAXED', color, age: 0 });
      setup.onLand(landing.bin.mine);
    }
    round.fresh = [];
    splashes = splashes.filter((s) => (s.age += dt) < SPLASH_SECONDS);
    shake = Math.max(0, shake - dt);
    draw();
    setup.onHud(hud());
    // Idle once the round is over and the last splash has faded; restart wakes it.
    frame = round.over && splashes.length === 0 ? 0 : requestAnimationFrame(tick);
  };

  const start = () => {
    if (frame) return;
    last = 0;
    frame = requestAnimationFrame(tick);
  };
  const stop = () => {
    cancelAnimationFrame(frame);
    frame = 0;
    // Letting go while away would otherwise drop a ball on return.
    round.holding = null;
  };
  const onVisibility = () => {
    if (document.hidden) stop();
    else start();
  };

  resize();
  window.addEventListener('resize', resize);
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('blur', stop);
  window.addEventListener('focus', start);
  setup.onHud(hud());
  draw();
  start();

  return {
    hold: () => {
      if (!setup.watch) startHold(round);
    },
    release: () => {
      if (!setup.watch) release(round);
    },
    nudge: (direction) => {
      if (!setup.watch && useNudge(round, direction)) shake = SHAKE_SECONDS;
    },
    restart: () => {
      round = newRound(setup.bins, setup.ballValue, seedFrom(), Math.random());
      splashes = [];
      watchClock = 0;
      setup.onHud(hud());
      start();
    },
    unmount: () => {
      stop();
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', stop);
      window.removeEventListener('focus', start);
    },
  };
}
