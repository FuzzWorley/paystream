import { useEffect, useRef, useState } from 'preact/hooks';
import { sharesFromRates } from '../games/catcher/engine';
import { BOARD } from '../games/catcher/engine';
import { mount, type Controls, type Hud } from '../games/catcher/game';
import { formatPercent, formatUsd } from '../lib/format';
import { split } from '../lib/model';
import { reducedMotion } from '../lib/motion';
import { recordRound } from '../lib/scores';
import { playCoin, streamMuted } from '../lib/sound';
import { gamePalette } from '../ui/gamePalette';
import './Games.css';

const points = (share: number) => `${share >= 0 ? '+' : ''}${(share * 100).toFixed(1)}`;

/**
 * Coin catcher (D29): your pay rains down in its real split; whatever reaches the floor goes to
 * its owner, and whatever your jar catches is yours. Snatch the taxman's wobbling coins.
 */
export function Catcher() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const controls = useRef<Controls | null>(null);
  const [hud, setHud] = useState<Hud | null>(null);
  const [newBest, setNewBest] = useState(false);
  const recorded = useRef(false);

  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    streamMuted.value = true;
    const rates = split.peek();
    controls.current = mount(el, {
      shares: sharesFromRates(rates),
      coinValue: rates.reduce((sum, r) => sum + r.rate, 0) * 60,
      palette: gamePalette(),
      reducedMotion: reducedMotion.peek(),
      onHud: setHud,
      onKeep: playCoin,
    });
    return () => {
      controls.current?.unmount();
      controls.current = null;
      streamMuted.value = false;
    };
  }, []);

  useEffect(() => {
    if (!hud?.over || recorded.current || hud.keptShare === null) return;
    recorded.current = true;
    setNewBest(recordRound('catcher', hud.keptShare - hud.fairShare));
  }, [hud]);

  // Keyboard: the arrows slide the jar while held.
  useEffect(() => {
    const held = new Set<string>();
    const update = () => {
      const left = held.has('ArrowLeft');
      const right = held.has('ArrowRight');
      controls.current?.slide(left === right ? 0 : left ? -1 : 1);
    };
    const down = (e: KeyboardEvent) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.preventDefault();
      held.add(e.key);
      update();
    };
    const up = (e: KeyboardEvent) => {
      held.delete(e.key);
      update();
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, []);

  /** Pointer x on the board, in the game's own units. */
  const toBoard = (e: PointerEvent) => {
    const box = (e.currentTarget as HTMLElement).getBoundingClientRect();
    return ((e.clientX - box.left) / box.width) * BOARD.width;
  };

  const share = hud?.keptShare ?? null;
  const fair = hud?.fairShare ?? 0;
  const seconds = Math.ceil(hud?.secondsLeft ?? 60);

  return (
    <div class="screen">
      <header class="screen-header numbers-header">
        <a class="icon-button" href="/games" aria-label="Back to the games">
          <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </a>
        <h1 class="numbers-title">Coin catcher</h1>
      </header>

      <main class="screen-main pc">
        <div class="pc-hud">
          <span class="pc-stat">
            <span class="pc-stat-label">Time</span>
            <span class="pc-stat-value figures">0:{String(seconds).padStart(2, '0')}</span>
          </span>
          <span class="pc-stat">
            <span class="pc-stat-label">You kept</span>
            <span class="pc-stat-value figures pc-stat-you">
              {share === null ? '—' : formatPercent(share)}
            </span>
          </span>
          <span class="pc-stat">
            <span class="pc-stat-label">Real</span>
            <span class="pc-stat-value figures">{formatPercent(fair)}</span>
          </span>
        </div>

        <div class="pc-board">
          <canvas
            ref={canvas}
            class="pc-canvas pc-canvas-catcher"
            role="img"
            aria-label={`Coin catcher. Coins fall in your real split: you keep ${formatPercent(fair)} unless you catch more.`}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              controls.current?.aimJar(toBoard(e));
            }}
            onPointerMove={(e) => {
              if (e.buttons > 0 || e.pointerType === 'touch') controls.current?.aimJar(toBoard(e));
            }}
          />
          {hud?.over && (
            <div class="pc-result" role="status">
              {share === null ? (
                <p class="pc-result-big">No coins fell</p>
              ) : (
                <>
                  <p class="pc-result-big">
                    {share > fair ? 'You beat the taxman' : share < fair ? 'The taxman won' : 'Dead even'}
                  </p>
                  <p>
                    You kept {formatPercent(share)}, snatching {formatUsd(hud.snatched)} from the taxman; your
                    real take-home is {formatPercent(fair)}: {points(share - fair)} points.
                  </p>
                  {newBest && <p class="pc-stat-you">New best!</p>}
                </>
              )}
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
        <p class="pc-help">
          Drag on the board (or hold the arrow keys) to slide your jar. Coins that land go to their owner;
          coins you catch are yours. Ringed coins are taxes.
        </p>
      </main>
    </div>
  );
}
