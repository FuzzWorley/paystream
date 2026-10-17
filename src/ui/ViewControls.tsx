import { COINS, TIME_UNITS } from '../core/cadence';
import { formatCoin } from '../lib/format';
import { coin } from '../lib/model';
import { settings, updateSettings } from '../lib/settings';
import './ViewControls.css';

interface Option {
  text: string;
  pressed: boolean;
  onPick: () => void;
}

function Segmented({ id, label, options }: { id: string; label: string; options: Option[] }) {
  return (
    <div class="control">
      <span id={id} class="control-label">
        {label}
      </span>
      <div class="control-well" role="group" aria-labelledby={id}>
        {options.map((o) => (
          <button key={o.text} type="button" class="seg-option" aria-pressed={o.pressed} onClick={o.onPick}>
            {o.text}
          </button>
        ))}
      </div>
    </div>
  );
}

interface StepperProps<T> {
  id: string;
  label: string;
  ladder: readonly T[];
  value: T;
  show: (rung: T) => string;
  /** Names for the buttons, e.g. "Smaller unit", "Bigger unit". */
  names: readonly [string, string];
  onPick: (rung: T) => void;
}

/** Down and up a ladder (coins, time frames), stopping at either end (D17). */
function Stepper<T>({ id, label, ladder, value, show, names, onPick }: StepperProps<T>) {
  const at = ladder.indexOf(value);
  const step = (direction: 1 | -1) => {
    const next = ladder[at + direction];
    if (next !== undefined) onPick(next);
  };
  return (
    <div class="control">
      <span id={id} class="control-label">
        {label}
      </span>
      <div class="control-well" role="group" aria-labelledby={id}>
        <button
          type="button"
          class="step-button"
          aria-label={names[0]}
          disabled={at <= 0}
          onClick={() => {
            step(-1);
          }}
        >
          −
        </button>
        <span class="step-value">{show(value)}</span>
        <button
          type="button"
          class="step-button"
          aria-label={names[1]}
          disabled={at >= ladder.length - 1}
          onClick={() => {
            step(1);
          }}
        >
          +
        </button>
      </div>
    </div>
  );
}

/**
 * Everything that changes how the streams are shown, in one row between the headline and the
 * river (D26): which clock, which coin and time frame (D17), split or combined taxes (D18).
 */
export function ViewControls() {
  const s = settings.value;
  const around = s.clock.kind === 'around';
  return (
    <div class="controls">
      <Segmented
        id="control-clock"
        label="Clock"
        options={[
          {
            text: '24 h',
            pressed: around,
            onPick: () => {
              updateSettings({ clock: { kind: 'around' } });
            },
          },
          {
            text: 'Work',
            pressed: !around,
            onPick: () => {
              if (around) updateSettings({ clock: { kind: 'work', ...settings.value.workWeek } });
            },
          },
        ]}
      />
      <Stepper
        id="control-unit"
        label="Unit"
        ladder={COINS}
        value={coin.value}
        show={formatCoin}
        names={['Smaller unit', 'Bigger unit']}
        onPick={(c) => {
          updateSettings({ coin: c });
        }}
      />
      <Stepper
        id="control-time"
        label="Time"
        ladder={TIME_UNITS}
        value={s.timeUnit}
        show={(u) => u}
        names={['Shorter time', 'Longer time']}
        onPick={(u) => {
          updateSettings({ timeUnit: u });
        }}
      />
      <Segmented
        id="control-taxes"
        label="Taxes"
        options={[
          {
            text: 'Split',
            pressed: !s.combineTaxes,
            onPick: () => {
              updateSettings({ combineTaxes: false });
            },
          },
          {
            text: 'All',
            pressed: s.combineTaxes,
            onPick: () => {
              updateSettings({ combineTaxes: true });
            },
          },
        ]}
      />
    </div>
  );
}
