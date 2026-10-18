import { formatCoin, formatCountdown, formatPercent } from '../../lib/format';
import { lanes, views, type LaneId, type StreamView } from '../../lib/model';
import { reducedMotion } from '../../lib/motion';
import { settings } from '../../lib/settings';
import { editingState } from '../../ui/StreamNotes';
import { ViewControls } from '../../ui/ViewControls';
import './Hero.css';

const BLOCKS = 12;
const RANKS = ['1ST', '2ND', '3RD', '4TH', '5TH'];

const NAMES: Record<LaneId, string> = {
  you: 'YOU',
  federal: 'FEDERAL',
  socialSecurity: 'SOC SEC',
  state: 'STATE',
  medicare: 'MEDICARE',
  taxes: 'TAXES',
};

const cssName = (id: LaneId) => (id === 'socialSecurity' ? 'social-security' : id);

/** "HR", "WORKDAY": the time frame, short enough for the RATE column. */
const SHORT_TIME: Record<string, string> = {
  second: 'SEC',
  minute: 'MIN',
  hour: 'HR',
  'working hour': 'WORK HR',
  day: 'DAY',
  workday: 'WORKDAY',
  week: 'WK',
  'working week': 'WORK WK',
  month: 'MO',
  year: 'YR',
};

/** Whole cents landed, as a cabinet shows a score. */
const score = (dollars: number) => String(Math.round(dollars * 100)).padStart(6, '0');

function Row({ v, rank }: { v: StreamView; rank: number }) {
  const rate = settings.value.stateRate;
  const lit = Math.floor(v.progress * BLOCKS);
  const name =
    v.stream === 'state' && rate ? (
      <button
        type="button"
        class="ar-name ar-name-edit"
        onClick={() => {
          editingState.value = true;
        }}
      >
        {NAMES[v.stream]} <span class="ar-chip">{formatPercent(rate)}</span>
        <span class="visually-hidden">, change</span>
      </button>
    ) : (
      <span class="ar-name">{NAMES[v.stream]}</span>
    );
  return (
    <li class="ar-row" style={{ '--c': `var(--${cssName(v.stream)})` }}>
      <div class="ar-cols">
        <span class="ar-rank">{RANKS[rank] ?? ''}</span>
        {name}
        <span class="ar-rate">
          {v.timeAmount}/{SHORT_TIME[v.timeLabel] ?? v.timeLabel.toUpperCase()}
        </span>
        {/* Keyed by the score, so each landing coin flashes it (D19). */}
        <span key={v.landed.toFixed(2)} class="ar-score">
          {score(v.landed)}
        </span>
      </div>
      <div class="ar-blocks" aria-hidden="true">
        {Array.from({ length: BLOCKS }, (_, i) => (
          <span key={i} class={i < lit ? 'ar-block ar-lit' : 'ar-block'} />
        ))}
      </div>
    </li>
  );
}

export function Hero() {
  const you = views.value[0];
  if (!you) return null;
  // Ranked by rate, as a high-score table ranks players; take-home tops it at any normal salary.
  const rows = [...lanes.value].sort((a, b) => b.rate - a.rate);
  const coin = you.cadence ? formatCoin(you.cadence.coin) : null;
  const countdown = formatCountdown(you.nextIn);
  const credits = you.cadence ? Math.round(you.landed / you.cadence.coin) : 0;
  const pop = reducedMotion.value ? 0 : Math.max(0, 1 - you.progress * 3);

  return (
    <>
      <section class="ar-hero" aria-label="To you">
        <div class="ar-topline" aria-hidden="true">
          <span class="ar-1up">1UP</span>
          <span class="ar-credit">
            CREDIT <span>{String(credits).padStart(2, '0')}</span>
          </span>
        </div>
        <p class="ar-figure">{you.unitText}</p>
        <p class="ar-figure-time">{you.timeText}</p>
        <p class="ar-sub" aria-hidden="true">
          {countdown && coin ? `NEXT ${coin} IN ${countdown.toUpperCase()}` : ' '}
        </p>
      </section>

      <ViewControls />

      {rows.length > 0 && (
        <section class="ar-scores" aria-label="High scores: where each penny goes">
          <h2 class="ar-title">HIGH SCORES</h2>
          <div class="ar-cols ar-heads" aria-hidden="true">
            <span>RANK</span>
            <span>NAME</span>
            <span>RATE</span>
            <span class="ar-right">SCORE</span>
          </div>
          <ol class="ar-rows">
            {rows.map((v, i) => (
              <Row key={v.stream} v={v} rank={i} />
            ))}
          </ol>
          <p class="ar-pop" aria-hidden="true" style={{ opacity: pop.toFixed(2) }}>
            +{coin ?? ''} TO YOU
          </p>
          <a class="ar-start" href="/games">
            PRESS START
          </a>
        </section>
      )}
    </>
  );
}
