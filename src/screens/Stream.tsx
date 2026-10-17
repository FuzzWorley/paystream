import { FILING_STATUS_LABELS } from '../lib/labels';
import { formatPercent } from '../lib/format';
import { table } from '../lib/model';
import { settings } from '../lib/settings';
import { defaultSkin, skins } from '../skins';
import { ClockToggle } from '../ui/ClockToggle';
import { SalaryField } from '../ui/SalaryField';
import { SinceYouGotHere } from '../ui/SinceYouGotHere';
import { StreamNotes } from '../ui/StreamNotes';
import { StreamTable } from '../ui/StreamTable';
import './Stream.css';

function stateNote(rate: number | null): string {
  if (rate === null) return 'state tax not set';
  return rate > 0 ? `state ${formatPercent(rate)}` : 'no state income tax';
}

export function Stream() {
  const s = settings.value;
  const skin = skins.find((k) => k.id === s.skin) ?? defaultSkin;
  const { Hero } = skin;
  return (
    <div class="screen">
      <header class="screen-header">
        <span class="wordmark">
          pay<span>stream</span>
        </span>
        <ClockToggle />
      </header>

      <main class="screen-main">
        <h1 class="visually-hidden">Your pay, by the second</h1>
        <SalaryField />
        <Hero />
        <StreamNotes />
        <StreamTable />
      </main>

      <footer class="screen-footer">
        <SinceYouGotHere />
        <p class="footnote">
          {String(table.value.taxYear)} tax tables · {FILING_STATUS_LABELS[s.filingStatus].toLowerCase()} ·{' '}
          {stateNote(s.stateRate)} · estimates, not tax advice
        </p>
      </footer>
    </div>
  );
}
