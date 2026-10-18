import { useEffect, useRef, useState } from 'preact/hooks';
import type { Direction } from '../games/snake/engine';
import { mount, type Controls, type Hud } from '../games/snake/game';
import { formatPercent, formatUsd } from '../lib/format';
import { split } from '../lib/model';
import { recordRound } from '../lib/scores';
import { playCoin, streamMuted } from '../lib/sound';
import { gamePalette } from '../ui/gamePalette';
import './Games.css';

const KEYS: Record<string, Direction> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  w: 'up',
  s: 'down',
  a: 'left',
  d: 'right',
};
const SWIPE_PX = 24;

/**
 * Tax snake (D29): eat coins worth a minute of pay each. Take-home is yours; the taxes join the
 * snake, one segment per coin, in the real tax split. Gold coins are tax-free.
 */
export function Snake() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const controls = useRef<Controls | null>(null);
  const [hud, setHud] = useState<Hud | null>(null);
  const [newBest, setNewBest] = useState(false);
  const [youShare, setYouShare] = useState(0);
  const recorded = useRef(false);
  const swipe = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    streamMuted.value = true;
    const rates = split.peek();
    const gross = rates.reduce((sum, r) => sum + r.rate, 0);
    const you = gross > 0 ? (rates.find((r) => r.mine)?.rate ?? 0) / gross : 0;
    setYouShare(you);
    controls.current = mount(el, {
      youShare: you,
      taxes: rates.filter((r) => !r.mine).map((r) => ({ id: r.id, weight: r.rate })),
      coinValue: gross * 60,
      palette: gamePalette(),
      onHud: setHud,
      onEat: playCoin,
    });
    return () => {
      controls.current?.unmount();
      controls.current = null;
      streamMuted.value = false;
    };
  }, []);

  useEffect(() => {
    if (!hud?.over || recorded.current) return;
    recorded.current = true;
    setNewBest(hud.eaten > 0 && recordRound('snake', hud.eaten));
  }, [hud]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const to = KEYS[e.key];
      if (!to) return;
      e.preventDefault();
      controls.current?.turn(to);
    };
    window.addEventListener('keydown', down);
    return () => {
      window.removeEventListener('keydown', down);
    };
  }, []);

  const seconds = Math.ceil(hud?.secondsLeft ?? 60);
  const pad = (to: Direction, label: string, glyph: string) => (
    <button
      type="button"
      class={`pc-button sn-${to}`}
      aria-label={label}
      onPointerDown={(e) => {
        e.preventDefault();
        controls.current?.turn(to);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') controls.current?.turn(to);
      }}
    >
      {glyph}
    </button>
  );

  return (
    <div class="screen">
      <header class="screen-header numbers-header">
        <a class="icon-button" href="/games" aria-label="Back to the games">
          <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </a>
        <h1 class="numbers-title">Tax snake</h1>
      </header>

      <main class="screen-main pc">
        <div class="pc-hud">
          <span class="pc-stat">
            <span class="pc-stat-label">Time</span>
            <span class="pc-stat-value figures">0:{String(seconds).padStart(2, '0')}</span>
          </span>
          <span class="pc-stat">
            <span class="pc-stat-label">Coins</span>
            <span class="pc-stat-value figures pc-stat-you">{hud?.eaten ?? 0}</span>
          </span>
          <span class="pc-stat">
            <span class="pc-stat-label">Kept</span>
            <span class="pc-stat-value figures">{formatUsd(hud?.kept ?? 0)}</span>
          </span>
        </div>

        <div class="pc-board">
          <canvas
            ref={canvas}
            class="pc-canvas pc-canvas-snake"
            role="img"
            aria-label={`Tax snake. Each coin is ${formatPercent(youShare)} yours; its taxes join the snake.`}
            onPointerDown={(e) => {
              swipe.current = { x: e.clientX, y: e.clientY };
            }}
            onPointerUp={(e) => {
              const from = swipe.current;
              swipe.current = null;
              if (!from) return;
              const dx = e.clientX - from.x;
              const dy = e.clientY - from.y;
              if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_PX) return;
              controls.current?.turn(
                Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up',
              );
            }}
          />
          {hud && hud.length > 0 && !hud.over && hud.secondsLeft === 60 && (
            <p class="sn-start" aria-hidden="true">
              Swipe or press an arrow to start
            </p>
          )}
          {hud?.over && (
            <div class="pc-result" role="status">
              <p class="pc-result-big">{hud.crashed ? 'Crashed' : 'Time'}</p>
              <p>
                {hud.eaten} coins: {formatUsd(hud.kept)} kept and {formatUsd(hud.taxed)} in taxes, carried as{' '}
                {hud.length - 3} segments.
              </p>
              {newBest && <p class="pc-stat-you">New best!</p>}
              <button
                type="button"
                class="pc-again"
                onClick={() => {
                  recorded.current = false;
                  setNewBest(false);
                  controls.current?.restart();
                }}
              >
                Play again
              </button>
            </div>
          )}
        </div>

        <div class="sn-pad">
          {pad('up', 'Up', '▲')}
          {pad('left', 'Left', '◀')}
          {pad('right', 'Right', '▶')}
          {pad('down', 'Down', '▼')}
        </div>
        <p class="pc-help">
          Swipe, use the arrows (or WASD), or the pad. Each coin is a minute of your pay; its taxes become
          segments. Gold coins are tax-free.
        </p>
      </main>
    </div>
  );
}
