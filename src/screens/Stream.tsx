import { FILING_STATUS_LABELS } from '../lib/labels';
import { formatPercent } from '../lib/format';
import { table } from '../lib/model';
import { settings } from '../lib/settings';
import { activeSkin } from '../skins';
import { NumbersLink } from '../ui/NumbersLink';
import { SalaryField } from '../ui/SalaryField';
import { SinceYouGotHere } from '../ui/SinceYouGotHere';
import { SkinPicker } from '../ui/SkinPicker';
import { StreamNotes } from '../ui/StreamNotes';
import { StreamTable } from '../ui/StreamTable';
import { YourThings } from '../ui/YourThings';

function stateNote(rate: number | null): string {
  if (rate === null) return 'state tax not set';
  return rate > 0 ? `state ${formatPercent(rate)}` : 'no state income tax';
}

export function Stream() {
  const s = settings.value;
  const { Hero } = activeSkin.value.module;
  return (
    <div class="screen">
      <header class="screen-header">
        <span class="wordmark">
          pay<span>stream</span>
        </span>
        <div class="header-actions">
          <SkinPicker place="header" />
          <NumbersLink />
        </div>
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
        <YourThings />
        <p class="footnote">
          <a href="/numbers#sources">{String(table.value.taxYear)} tax tables</a> ·{' '}
          {FILING_STATUS_LABELS[s.filingStatus].toLowerCase()} · {stateNote(s.stateRate)} ·{' '}
          {s.clock.kind === 'work' && (
            <>
              <a href="/numbers#clock">
                {String(s.clock.hoursPerWeek)} h a week × {String(s.clock.weeksPerYear)} weeks
              </a>{' '}
              ·{' '}
            </>
          )}
          estimates, not tax advice · <a href="/privacy">privacy</a>
        </p>
      </footer>
    </div>
  );
}
