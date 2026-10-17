import { settings, updateSettings } from '../lib/settings';

const WORK_WEEK = { kind: 'work', hoursPerWeek: 40, weeksPerYear: 52 } as const;

export function ClockToggle() {
  const around = settings.value.clock.kind === 'around';
  return (
    <div class="toggle" role="group" aria-label="Which clock">
      <button
        type="button"
        class="toggle-option"
        aria-pressed={around}
        onClick={() => {
          updateSettings({ clock: { kind: 'around' } });
        }}
      >
        24 h
      </button>
      <button
        type="button"
        class="toggle-option"
        aria-pressed={!around}
        onClick={() => {
          if (around) updateSettings({ clock: WORK_WEEK });
        }}
      >
        At work
      </button>
    </div>
  );
}
