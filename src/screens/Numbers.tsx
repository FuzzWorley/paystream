import type { ComponentChildren } from 'preact';
import { FILING_STATUSES, type Stream } from '../core/types';
import { formatDate, formatPercent, formatUsd } from '../lib/format';
import { FILING_STATUS_LABELS } from '../lib/labels';
import { annual, overTaxed, shares, table, wageCap, type WageCap } from '../lib/model';
import { settings, updateSettings, WORK_LIMITS, type WorkWeek } from '../lib/settings';
import { OverrideField } from '../ui/OverrideField';
import { SalaryField } from '../ui/SalaryField';
import { SkinPicker } from '../ui/SkinPicker';
import { SoundSwitch } from '../ui/SoundSwitch';
import { StateRateField } from '../ui/StateRateField';
import { ThingsEditor } from '../ui/ThingsEditor';
import './Numbers.css';

const cssName = (stream: Stream) => (stream === 'socialSecurity' ? 'social-security' : stream);

function Row({ stream, label, children }: { stream: Stream; label: string; children: ComponentChildren }) {
  return (
    <div class="num-row">
      <div class="num-row-top">
        <span class="num-dot" style={{ background: `var(--${cssName(stream)})` }} aria-hidden="true" />
        <span class="num-label">{label}</span>
        <span class="num-amount figures">{formatUsd(annual.value[stream], 0)}</span>
      </div>
      <div class="num-row-control">{children}</div>
    </div>
  );
}

function wageCapText(cap: WageCap, year: string): string {
  switch (cap.kind) {
    case 'override':
      return 'With your own Social Security rate there is no wage cap: it flows all year.';
    case 'never':
      return `Your salary stays under the ${formatUsd(cap.wageBase, 0)} wage cap, so Social Security flows all year.`;
    case 'upcoming':
      return `Social Security stops on ${formatDate(cap.on)} for you, at the ${formatUsd(cap.wageBase, 0)} wage cap, and starts again on Jan 1. Take-home speeds up that day.`;
    case 'reached':
      return `You reached the ${formatUsd(cap.wageBase, 0)} wage cap on ${formatDate(cap.on)}, so Social Security is paid up for ${year}. It starts again on Jan 1.`;
  }
}

function WorkWeekField({ name, label, unit }: { name: keyof WorkWeek; label: string; unit: string }) {
  const week = settings.value.workWeek;
  const max = WORK_LIMITS[name];
  return (
    <label class="field clock-number">
      <span class="visually-hidden">{label}</span>
      <input
        class="figures"
        inputMode="decimal"
        autoComplete="off"
        defaultValue={String(week[name])}
        onInput={(e) => {
          const value = Number.parseFloat(e.currentTarget.value);
          if (!(value >= 1 && value <= max)) return;
          const next = { ...settings.value.workWeek, [name]: value };
          const s = settings.value;
          updateSettings({
            workWeek: next,
            clock: s.clock.kind === 'work' ? { kind: 'work', ...next } : s.clock,
          });
        }}
      />
      <span aria-hidden="true">{unit}</span>
    </label>
  );
}

export function Numbers() {
  const s = settings.value;
  const year = String(table.value.taxYear);
  const share = shares.value;
  const work = s.clock.kind === 'work';

  return (
    <div class="screen">
      <header class="screen-header numbers-header">
        <a class="icon-button" href="/" aria-label="Back to the stream">
          <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </a>
        <h1 class="numbers-title">Your numbers</h1>
      </header>

      <main class="screen-main numbers">
        <SalaryField />

        <section class="card">
          <label class="card-row" for="filing-status">
            <span>Filing status</span>
            <select
              id="filing-status"
              class="field"
              value={s.filingStatus}
              onChange={(e) => {
                const v = FILING_STATUSES.find((f) => f === e.currentTarget.value);
                if (v) updateSettings({ filingStatus: v });
              }}
            >
              {FILING_STATUSES.map((f) => (
                <option key={f} value={f}>
                  {FILING_STATUS_LABELS[f]}
                </option>
              ))}
            </select>
          </label>
          {s.filingStatus === 'married_joint' && (
            <p class="card-note">Worked out for one earner’s wages: the Social Security cap is per person.</p>
          )}
        </section>

        <section class="card" aria-labelledby="year-title">
          <h2 id="year-title" class="card-title">
            Where it goes, each year
          </h2>
          <Row stream="federal" label="Federal income tax">
            <OverrideField tax="federal" label="Federal income tax" />
          </Row>
          <Row stream="socialSecurity" label="Social Security">
            <OverrideField tax="socialSecurity" label="Social Security" />
          </Row>
          <Row stream="medicare" label="Medicare">
            <OverrideField tax="medicare" label="Medicare" />
          </Row>
          <Row stream="state" label="State income tax">
            <StateRateField />
          </Row>
          <div class="num-row num-keep">
            <div class="num-row-top">
              <span class="num-dot" style={{ background: 'var(--you)' }} aria-hidden="true" />
              <span class="num-label">You keep</span>
              <span class="num-amount figures">
                {formatUsd(Math.max(0, annual.value.you), 0)} · {formatPercent(Math.max(0, share.you))}
              </span>
            </div>
          </div>
          {overTaxed.value && (
            <p class="card-warning" role="status">
              Your rates add up to more than your salary, so nothing reaches you. Check the rates you typed.
            </p>
          )}
          <p class="card-note">{wageCapText(wageCap.value, year)}</p>
          <p class="card-note">
            Rates are worked out from the {year} tables. Type your own to replace one: it becomes a flat share
            of salary, with no cap.
          </p>
        </section>

        <section class="card" id="clock" aria-labelledby="clock-title">
          <h2 id="clock-title" class="card-title">
            Which clock
          </h2>
          <label class="radio-row">
            <input
              type="radio"
              name="clock"
              checked={!work}
              onChange={() => {
                updateSettings({ clock: { kind: 'around' } });
              }}
            />
            <span>
              Around the clock <span class="muted">· every second of the year</span>
            </span>
          </label>
          <div class="radio-row">
            <input
              id="clock-work"
              type="radio"
              name="clock"
              checked={work}
              onChange={() => {
                updateSettings({ clock: { kind: 'work', ...settings.value.workWeek } });
              }}
            />
            <label for="clock-work">While I work</label>
            <span class="clock-hours">
              <WorkWeekField name="hoursPerWeek" label="Hours a week" unit="h a week" />
              <span aria-hidden="true">×</span>
              <WorkWeekField name="weeksPerYear" label="Weeks a year" unit="weeks" />
            </span>
          </div>
        </section>

        <section class="card" id="things" aria-labelledby="things-edit-title">
          <h2 id="things-edit-title" class="card-title">
            Your things
          </h2>
          <p class="card-note">Priced in take-home time, beside Since you got here.</p>
          <ThingsEditor />
        </section>

        <section class="card" aria-labelledby="look-title">
          <h2 id="look-title" class="card-title">
            Look and sound
          </h2>
          <SkinPicker place="card" />
          <SoundSwitch />
        </section>

        <section class="card" id="sources" aria-labelledby="sources-title">
          <h2 id="sources-title" class="card-title">
            {year} tax tables
          </h2>
          <ul class="sources">
            {table.value.sources.map((src) => (
              <li key={src.url + src.what}>
                <a href={src.url} rel="noreferrer" target="_blank">
                  {src.what}
                </a>{' '}
                <span class="muted">· {src.where}</span>
              </li>
            ))}
          </ul>
          <p class="card-note">
            Estimates, not tax advice. No pre-tax deductions (401(k), HSA); type a lower federal rate to
            account for them.
          </p>
        </section>
      </main>

      <footer class="screen-footer">
        <p class="footnote">
          Everything here stays in this browser. <a href="/privacy">How</a>
        </p>
      </footer>
    </div>
  );
}
