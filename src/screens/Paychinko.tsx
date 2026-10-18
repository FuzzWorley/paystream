import { useEffect, useRef, useState } from 'preact/hooks';
import { useLocation } from 'preact-iso';
import { binsFromRates } from '../games/paychinko/engine';
import { mount, type Controls, type Hud } from '../games/paychinko/game';
import { formatPercent, formatUsd } from '../lib/format';
import { split } from '../lib/model';
import { reducedMotion } from '../lib/motion';
import { recordRound } from '../lib/scores';
import { playCoin, streamMuted } from '../lib/sound';
import { GAME_NAMES, gamePalette } from '../ui/gamePalette';
import './Games.css';

const points = (share: number) => `${share >= 0 ? '+' : ''}${(share * 100).toFixed(1)}`;

/**
 * Paychinko (D28): drop coins through the pegs into bins sized by the real split. Chance alone
 * keeps your real take-home share; timing, aim and three nudges a round are how you beat it.
 */
export function Paychinko() {
  const { query } = useLocation();
  const watch = 'watch' in query;
  const canvas = useRef<HTMLCanvasElement>(null);
  const controls = useRef<Controls | null>(null);
  const [hud, setHud] = useState<Hud | null>(null);
  const [holding, setHolding] = useState(false);
  const [newBest, setNewBest] = useState(false);
  const recorded = useRef(false);

  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    streamMuted.value = true;
    const rates = split.peek();
    const gross = rates.reduce((sum, r) => sum + r.rate, 0);
    controls.current = mount(el, {
      bins: binsFromRates(rates),
      ballValue: gross * 60,
      palette: gamePalette(),
      names: GAME_NAMES,
      watch,
      reducedMotion: reducedMotion.peek(),
      onHud: setHud,
      onLand: (mine) => {
        if (mine) playCoin();
      },
    });
    return () => {
      controls.current?.unmount();
      controls.current = null;
      streamMuted.value = false;
    };
  }, [watch]);

  // A finished round counts once, and only when played, not watched.
  useEffect(() => {
    if (!hud?.over || watch || recorded.current || hud.keptShare === null) return;
    recorded.current = true;
    setNewBest(recordRound('paychinko', hud.keptShare - hud.fairShare));
  }, [hud, watch]);

  const hold = () => {
    controls.current?.hold();
    setHolding(true);
  };
  const drop = () => {
    controls.current?.release();
    setHolding(false);
  };

  // Keyboard: hold Space (or Enter) to aim, let go to drop; the arrows nudge.
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        hold();
      } else if (e.key === 'ArrowLeft') controls.current?.nudge(-1);
      else if (e.key === 'ArrowRight') controls.current?.nudge(1);
    };
    const up = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        drop();
      }
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, []);

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
        <h1 class="numbers-title">{watch ? 'Paychinko · watching chance' : 'Paychinko'}</h1>
      </header>

      <main class="screen-main pc">
        <div class="pc-hud" aria-live="off">
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
            class="pc-canvas"
            role="img"
            aria-label={`Paychinko board. Bins sized by your real split: you keep ${formatPercent(fair)}.`}
            onPointerDown={(e) => {
              if (watch) return;
              e.currentTarget.setPointerCapture(e.pointerId);
              hold();
            }}
            onPointerUp={() => {
              if (!watch) drop();
            }}
            onPointerCancel={() => {
              if (!watch) drop();
            }}
          />
          {hud?.over && (
            <div class="pc-result" role="status">
              {share === null ? (
                <p class="pc-result-big">No coins dropped</p>
              ) : watch ? (
                <>
                  <p class="pc-result-big">Chance kept {formatPercent(share)}</p>
                  <p>Your real take-home is {formatPercent(fair)}. Left alone, the coins find your split.</p>
                </>
              ) : (
                <>
                  <p class="pc-result-big">
                    {share > fair ? 'You beat the taxman' : share < fair ? 'The taxman won' : 'Dead even'}
                  </p>
                  <p>
                    You kept {formatPercent(share)} ({formatUsd(hud.kept)} of{' '}
                    {formatUsd(hud.kept + hud.taxed)}); your real take-home is {formatPercent(fair)}:{' '}
                    {points(share - fair)} points.
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
                {watch ? 'Watch again' : 'Play again'}
              </button>
            </div>
          )}
        </div>

        {watch ? (
          <p class="pc-help">
            Random aims at random moments, never nudged. <a href="/games/paychinko">Play it yourself</a>
          </p>
        ) : (
          <>
            <div class="pc-controls">
              <button
                type="button"
                class="pc-button"
                aria-label="Nudge left"
                disabled={!hud || hud.nudgesLeft === 0 || hud.over}
                onClick={() => controls.current?.nudge(-1)}
              >
                ◀
              </button>
              <button
                type="button"
                class="pc-button pc-drop"
                aria-pressed={holding}
                onPointerDown={(e) => {
                  e.currentTarget.setPointerCapture(e.pointerId);
                  hold();
                }}
                onPointerUp={drop}
                onPointerCancel={drop}
                onKeyDown={(e) => {
                  // Space and Enter are handled for the whole screen.
                  if (e.key === ' ' || e.key === 'Enter') e.preventDefault();
                }}
              >
                {holding ? 'Release to drop' : 'Hold to aim'}
              </button>
              <button
                type="button"
                class="pc-button"
                aria-label="Nudge right"
                disabled={!hud || hud.nudgesLeft === 0 || hud.over}
                onClick={() => controls.current?.nudge(1)}
              >
                ▶
              </button>
            </div>
            <p class="pc-help">
              Nudges left: {hud?.nudgesLeft ?? 3}. Keys: hold Space, arrows to nudge. Each coin is a minute of
              your pay.
            </p>
          </>
        )}
      </main>
    </div>
  );
}
