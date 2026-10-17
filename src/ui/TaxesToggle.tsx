import { settings, updateSettings } from '../lib/settings';

/** Each tax as its own stream, or all of them as one (D18). */
export function TaxesToggle() {
  const combined = settings.value.combineTaxes;
  return (
    <div class="toggle toggle-small" role="group" aria-label="Show taxes">
      <button
        type="button"
        class="toggle-option"
        aria-pressed={!combined}
        onClick={() => {
          updateSettings({ combineTaxes: false });
        }}
      >
        Split
      </button>
      <button
        type="button"
        class="toggle-option"
        aria-pressed={combined}
        onClick={() => {
          updateSettings({ combineTaxes: true });
        }}
      >
        Combined
      </button>
    </div>
  );
}
