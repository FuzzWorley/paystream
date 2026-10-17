import type { Coin } from '../../core/cadence';
import { formatAmount, formatCoin, formatCountdown, formatDigits, formatPercent } from '../../lib/format';
import { flowing, views, type StreamView } from '../../lib/model';
import { reducedMotion } from '../../lib/motion';
import { EXAMPLE_SALARY, settings } from '../../lib/settings';
import { RateSteppers } from '../../ui/RateSteppers';
import { editingState } from '../../ui/StreamNotes';
import './Hero.css';

const DROPS = 5;

const cssName = (stream: StreamView['stream']) => (stream === 'socialSecurity' ? 'social-security' : stream);

/** A drop's size is its coin, the same in every lane, so equal dots are equal money. */
const DROP_PX: Record<Coin, number> = { 0.01: 8, 0.1: 11, 1: 14, 10: 17, 100: 20 };

function Drops({ progress, coin }: { progress: number; coin: Coin }) {
  const still = reducedMotion.value;
  const size = `${String(DROP_PX[coin])}px`;
  // Each drop is a fraction of the way to the next coin; one reaching the end is a coin arriving.
  return (
    <>
      {Array.from({ length: DROPS }, (_, k) => {
        const x = (k + (still ? 0.5 : progress)) / DROPS;
        return (
          <span
            key={k}
            class="rv-drop"
            style={{
              '--d': size,
              left: `${(x * 100).toFixed(2)}%`,
              opacity: Math.min(1, x * 4).toFixed(2),
            }}
          />
        );
      })}
    </>
  );
}

function Lane({ v }: { v: StreamView }) {
  const rate = settings.value.stateRate;
  return (
    <div class="rv-lane" style={{ '--c': `var(--${cssName(v.stream)})` }}>
      <div class="rv-lane-top">
        {v.stream === 'state' && rate ? (
          <button
            type="button"
            class="rv-lane-label rv-lane-edit"
            onClick={() => {
              editingState.value = true;
            }}
          >
            {v.label} <span class="figures">{formatPercent(rate)}</span>
            <span class="visually-hidden">, change</span>
          </button>
        ) : (
          <span class="rv-lane-label">{v.label}</span>
        )}
        <span class="rv-lane-rate figures">{v.timeShort}</span>
      </div>
      <div class="rv-channel">
        <span class="rv-hook" aria-hidden="true" />
        <span class="rv-track" aria-hidden="true">
          {v.cadence && <Drops progress={v.progress} coin={v.cadence.coin} />}
        </span>
        <span class="rv-lane-earned figures">{formatAmount(v.earned)}</span>
      </div>
    </div>
  );
}

export function Hero() {
  const you = views.value[0];
  const lanes = flowing.value;
  if (!you) return null;
  const salary = settings.value.salary ?? EXAMPLE_SALARY;
  const countdown = formatCountdown(you.nextIn);
  const coin = you.cadence ? formatCoin(you.cadence.coin) : null;

  return (
    <>
      <section class="rv-hero" aria-label="To you">
        <p class="rv-eyebrow">To you</p>
        <p class="rv-figure">{you.unitText}</p>
        <p class="rv-figure-time">{you.timeText}</p>
        <p class="rv-sub figures" aria-hidden="true">
          {countdown && coin ? `next ${coin} in ${countdown}` : ' '}
        </p>
        <RateSteppers />
      </section>

      {lanes.length > 0 && (
        <section class="rv-lanes" aria-label="Where each penny goes">
          <p class="rv-gross figures">${formatDigits(salary)} a year in ↓</p>
          {lanes.map((v) => (
            <Lane key={v.stream} v={v} />
          ))}
        </section>
      )}
    </>
  );
}
