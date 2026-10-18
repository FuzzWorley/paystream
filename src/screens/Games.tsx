import { formatPercent } from '../lib/format';
import { split } from '../lib/model';
import { bests } from '../lib/scores';
import './Games.css';

const SHORT: Record<string, string> = {
  federal: 'Federal',
  socialSecurity: 'Social Security',
  state: 'State',
  medicare: 'Medicare',
};

const points = (share: number) => `${share >= 0 ? '+' : ''}${(share * 100).toFixed(1)}`;

/** The arcade's game select (D13). */
export function Games() {
  const parts = split.value.filter((p) => p.rate > 0);
  const total = parts.reduce((sum, p) => sum + p.rate, 0);
  const mine = parts.find((p) => p.mine);
  const best = bests.value['paychinko'];
  const catcher = bests.value['catcher'];
  const snake = bests.value['snake'];
  return (
    <div class="screen">
      <header class="screen-header numbers-header">
        <a class="icon-button" href="/" aria-label="Back to the stream">
          <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </a>
        <h1 class="numbers-title">Games</h1>
      </header>

      <main class="screen-main">
        <a class="game-card game-card-live" href="/games/paychinko">
          <span class="game-name">Paychinko</span>
          <span class="game-blurb">
            Drop your coins. The bins are your real split; time your drops and beat the taxman.
          </span>
          {total > 0 && (
            <span class="game-split" aria-label="Bin widths">
              {parts.map((p) => (
                <span
                  key={p.id}
                  class="game-split-part"
                  style={{
                    width: `${String((p.rate / total) * 100)}%`,
                    background: `var(--${p.id === 'socialSecurity' ? 'social-security' : p.id})`,
                  }}
                  title={`${p.mine ? 'You' : (SHORT[p.id] ?? p.id)} ${formatPercent(p.rate / total)}`}
                />
              ))}
            </span>
          )}
          <span class="game-meta">
            {mine && total > 0 ? `Your bin: ${formatPercent(mine.rate / total)}` : ''}
            {best ? ` · Best: ${points(best.value)} points` : ''}
          </span>
        </a>
        <a class="game-watch" href="/games/paychinko?watch">
          Watch chance play it: the bins fill in your real split
        </a>

        <a class="game-card" href="/games/catcher">
          <span class="game-name">Coin catcher</span>
          <span class="game-blurb">
            Your pay rains down in its real split. Slide your jar and snatch the taxman’s coins before they
            land.
          </span>
          {catcher && <span class="game-meta">Best: {points(catcher.value)} points</span>}
        </a>
        <a class="game-card" href="/games/snake">
          <span class="game-name">Tax snake</span>
          <span class="game-blurb">
            Eat coins worth a minute of your pay. Every coin’s taxes join you as a segment you carry.
          </span>
          {snake && <span class="game-meta">Best: {String(snake.value)} coins</span>}
        </a>
      </main>

      <footer class="screen-footer">
        <p class="footnote">Best scores stay on this device only.</p>
      </footer>
    </div>
  );
}
