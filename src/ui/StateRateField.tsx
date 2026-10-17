import { useEffect, useRef } from 'preact/hooks';
import { formatPercent } from '../lib/format';
import { settings, updateSettings } from '../lib/settings';
import './StateRateField.css';

/** Top marginal state rates are in the low teens; anything above this is a typo. */
const MAX_PERCENT = 20;

interface Props {
  /** Focus on mount, when the user asked to change an existing rate. */
  autoFocus?: boolean;
  onDone?: () => void;
}

/**
 * The one input the app needs beyond salary, shown where the State stream would flow (D2:
 * typed, not calculated). Streams update as you type.
 */
export function StateRateField({ autoFocus = false, onDone }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const rate = settings.peek().stateRate;
  useEffect(() => {
    if (autoFocus) input.current?.focus();
  }, [autoFocus]);

  const onInput = (e: Event) => {
    const el = e.currentTarget as HTMLInputElement;
    const cleaned = el.value.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1');
    if (cleaned !== el.value) el.value = cleaned;
    const percent = Number.parseFloat(cleaned);
    updateSettings({
      stateRate: Number.isFinite(percent) ? Math.min(percent, MAX_PERCENT) / 100 : null,
    });
  };

  return (
    <span class="state-field">
      <label for="state-rate" class="visually-hidden">
        Your state income tax rate, in percent
      </label>
      <span class="state-input-wrap">
        <input
          ref={input}
          id="state-rate"
          class="state-input figures"
          inputMode="decimal"
          autoComplete="off"
          placeholder="add"
          defaultValue={rate ? formatPercent(rate).replace('%', '') : ''}
          onInput={onInput}
          onBlur={onDone}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur();
          }}
        />
        <span class="state-percent figures" aria-hidden="true">
          %
        </span>
      </span>
      <button
        type="button"
        class="state-none"
        onPointerDown={(e) => {
          // Keep the input's blur from unmounting this button before the click lands.
          e.preventDefault();
        }}
        onClick={() => {
          updateSettings({ stateRate: 0 });
          onDone?.();
        }}
      >
        None in my state
      </button>
    </span>
  );
}
