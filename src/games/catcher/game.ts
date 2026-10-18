// Coin catcher on a canvas: drawing and the frame loop. Rules live in engine.ts; the hosting
// screen hands in the split, colours and callbacks, and owns the HUD.
import { startLoop } from '../loop';
import type { Palette } from '../palette';
import { rng } from '../random';
import {
  BOARD,
  COIN_R,
  FLOOR,
  JAR,
  ROUND_SECONDS,
  advance,
  fairShare,
  keptShare,
  moveJar,
  newRound,
  type Round,
  type Share,
} from './engine';

export interface Hud {
  secondsLeft: number;
  kept: number;
  taxed: number;
  snatched: number;
  keptShare: number | null;
  fairShare: number;
  over: boolean;
}

export interface Setup {
  shares: Share[];
  coinValue: number;
  palette: Palette;
  reducedMotion: boolean;
  onHud: (hud: Hud) => void;
  /** Each coin that ends up yours, for sound. */
  onKeep: () => void;
}

export interface Controls {
  /** Moves the jar to a board x, from a pointer. */
  aimJar: (boardX: number) => void;
  /** Starts or stops the jar sliding, from keys: -1, 0 or 1. */
  slide: (direction: -1 | 0 | 1) => void;
  restart: () => void;
  unmount: () => void;
}

const SLIDE_SPEED = 330; // px/s
const FLASH_SECONDS = 0.6;

interface Flash {
  x: number;
  y: number;
  text: string;
  color: string;
  age: number;
}

export function mount(canvas: HTMLCanvasElement, setup: Setup): Controls {
  const ctx = canvas.getContext('2d');
  const fresh = () => newRound(setup.shares, setup.coinValue, rng(Math.floor(Math.random() * 2 ** 31)));
  let round: Round = fresh();
  let sliding: -1 | 0 | 1 = 0;
  let flashes: Flash[] = [];
  const color = (s: Share) => setup.palette.streams[s.id] ?? setup.palette.text;

  const hud = (): Hud => ({
    secondsLeft: Math.max(0, ROUND_SECONDS - round.time),
    kept: round.kept,
    taxed: round.taxed,
    snatched: round.snatched,
    keptShare: keptShare(round),
    fairShare: fairShare(round),
    over: round.over,
  });

  const draw = () => {
    if (!ctx) return;
    const { palette } = setup;
    const scale = canvas.width / BOARD.width;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.fillStyle = palette.bg;
    ctx.fillRect(0, 0, BOARD.width, BOARD.height);
    // The floor, where uncaught coins land with their owners.
    ctx.fillStyle = palette.surface;
    ctx.fillRect(0, FLOOR, BOARD.width, BOARD.height - FLOOR);

    for (const c of round.coins) {
      ctx.fillStyle = color(c.share);
      ctx.beginPath();
      ctx.arc(c.x, c.y, COIN_R, 0, Math.PI * 2);
      ctx.fill();
      if (!c.share.mine) {
        // Tax coins carry a ring, so they read by shape as well as colour.
        ctx.strokeStyle = palette.bg;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(c.x, c.y, COIN_R - 3, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // The jar: an open-topped cup in your colour.
    const you = palette.streams['you'] ?? palette.text;
    const left = round.jarX - JAR.width / 2;
    ctx.strokeStyle = you;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(left, JAR.top);
    ctx.lineTo(left + 6, JAR.top + JAR.height);
    ctx.lineTo(left + JAR.width - 6, JAR.top + JAR.height);
    ctx.lineTo(left + JAR.width, JAR.top);
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.font = `bold 11px ${palette.font}`;
    for (const f of flashes) {
      ctx.globalAlpha = Math.max(0, 1 - f.age / FLASH_SECONDS);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y - (setup.reducedMotion ? 0 : f.age * 30));
    }
    ctx.globalAlpha = 1;
  };

  const loop = startLoop(canvas, BOARD.height / BOARD.width, (dt) => {
    if (sliding !== 0) moveJar(round, round.jarX + sliding * SLIDE_SPEED * dt);
    advance(round, dt);
    for (const e of round.fresh) {
      if (e.kind === 'caught') {
        flashes.push({
          x: e.x,
          y: JAR.top - 6,
          text: e.share.mine ? 'MINE' : 'SNATCHED',
          color: color(e.share),
          age: 0,
        });
        setup.onKeep();
      } else if (e.share.mine) {
        setup.onKeep();
      } else {
        flashes.push({ x: e.x, y: FLOOR - 6, text: 'TAXED', color: color(e.share), age: 0 });
      }
    }
    round.fresh = [];
    flashes = flashes.filter((f) => (f.age += dt) < FLASH_SECONDS);
    draw();
    setup.onHud(hud());
    return !(round.over && flashes.length === 0);
  });
  setup.onHud(hud());

  return {
    aimJar: (x) => {
      moveJar(round, x);
    },
    slide: (direction) => {
      sliding = direction;
    },
    restart: () => {
      round = fresh();
      flashes = [];
      setup.onHud(hud());
      loop.wake();
    },
    unmount: () => {
      loop.stop();
    },
  };
}
