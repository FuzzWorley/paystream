// Tax snake on a canvas: drawing and the frame loop. Rules live in engine.ts; the hosting
// screen hands in the split, colours and callbacks, and owns the HUD and buttons.
import { startLoop } from '../loop';
import type { Palette } from '../palette';
import { rng } from '../random';
import {
  GRID,
  ROUND_SECONDS,
  advance,
  newRound,
  turn,
  type Direction,
  type Round,
  type TaxShare,
} from './engine';

export interface Hud {
  secondsLeft: number;
  eaten: number;
  kept: number;
  taxed: number;
  length: number;
  crashed: boolean;
  over: boolean;
}

export interface Setup {
  youShare: number;
  taxes: TaxShare[];
  coinValue: number;
  palette: Palette;
  onHud: (hud: Hud) => void;
  onEat: () => void;
}

export interface Controls {
  turn: (to: Direction) => void;
  restart: () => void;
  unmount: () => void;
}

const CELL = 20;

export function mount(canvas: HTMLCanvasElement, setup: Setup): Controls {
  const ctx = canvas.getContext('2d');
  const fresh = () =>
    newRound(setup.youShare, setup.taxes, setup.coinValue, rng(Math.floor(Math.random() * 2 ** 31)));
  let round: Round = fresh();
  // The snake waits for the first turn, so a round never starts before the player does.
  let started = false;

  const hud = (): Hud => ({
    secondsLeft: Math.max(0, ROUND_SECONDS - round.time),
    eaten: round.eaten,
    kept: round.kept,
    taxed: round.taxed,
    length: round.snake.length,
    crashed: round.crashed,
    over: round.over,
  });

  const draw = () => {
    if (!ctx) return;
    const { palette } = setup;
    const scale = canvas.width / (GRID.cols * CELL);
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.fillStyle = palette.bg;
    ctx.fillRect(0, 0, GRID.cols * CELL, GRID.rows * CELL);
    // A faint checker so movement reads cell by cell.
    ctx.fillStyle = palette.surface;
    for (let y = 0; y < GRID.rows; y++) {
      for (let x = (y % 2) as 0 | 1; x < GRID.cols; x += 2) ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
    }

    const coin = (x: number, y: number, fill: string) => {
      ctx.fillStyle = fill;
      ctx.beginPath();
      ctx.arc(x * CELL + CELL / 2, y * CELL + CELL / 2, CELL * 0.36, 0, Math.PI * 2);
      ctx.fill();
    };
    coin(round.coin.x, round.coin.y, palette.streams['you'] ?? palette.text);
    if (round.gold) {
      // Gold is tax-free: drawn in the text colour with a ring, and blinking as it runs out.
      const fading = round.gold.left < 2 && Math.floor(round.gold.left * 6) % 2 === 0;
      if (!fading) {
        coin(round.gold.x, round.gold.y, palette.text);
        ctx.strokeStyle = palette.streams['you'] ?? palette.text;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(round.gold.x * CELL + CELL / 2, round.gold.y * CELL + CELL / 2, CELL * 0.46, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    round.snake.forEach((s, i) => {
      const color =
        s.kind === 'head' || s.kind === 'you'
          ? (palette.streams['you'] ?? palette.text)
          : (palette.streams[s.kind] ?? palette.muted);
      ctx.fillStyle = color;
      const inset = i === 0 ? 1 : 2;
      ctx.fillRect(s.x * CELL + inset, s.y * CELL + inset, CELL - 2 * inset, CELL - 2 * inset);
    });
    const head = round.snake[0];
    if (head) {
      // Eyes, so the head reads apart from the body.
      ctx.fillStyle = palette.bg;
      ctx.fillRect(head.x * CELL + 6, head.y * CELL + 6, 3, 3);
      ctx.fillRect(head.x * CELL + 11, head.y * CELL + 6, 3, 3);
    }
  };

  const loop = startLoop(canvas, GRID.rows / GRID.cols, (dt) => {
    if (started) advance(round, dt);
    for (const e of round.fresh) if (e !== 'crash') setup.onEat();
    round.fresh = [];
    draw();
    setup.onHud(hud());
    return !round.over;
  });
  setup.onHud(hud());

  return {
    turn: (to) => {
      started = true;
      turn(round, to);
    },
    restart: () => {
      round = fresh();
      started = false;
      setup.onHud(hud());
      loop.wake();
    },
    unmount: () => {
      loop.stop();
    },
  };
}
