import { settings, updateSettings } from '../lib/settings';

/** Which seconds count as earning, with a few words saying what the choice means. */
export function ClockToggle() {
  const { clock, workWeek } = settings.value;
  const around = clock.kind === 'around';
  return (
    <div class="clock-row">
      <div class="toggle" role="group" aria-label="Which clock" aria-describedby="clock-means">
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
            if (around) updateSettings({ clock: { kind: 'work', ...workWeek } });
          }}
        >
          At work
        </button>
      </div>
      <a id="clock-means" class="clock-means" href="/numbers#clock">
        {around
          ? 'every second of the year'
          : `${String(workWeek.hoursPerWeek)} h a week × ${String(workWeek.weeksPerYear)} weeks`}
      </a>
    </div>
  );
}
