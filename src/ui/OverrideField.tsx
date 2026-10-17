import { useRef } from 'preact/hooks';
import type { Overrides } from '../core/types';
import { calculatedShares } from '../lib/model';
import { settings, updateSettings } from '../lib/settings';
import { percentText, readPercent } from './percentInput';

type Overridable = keyof Overrides;

/**
 * A tax's rate as the tables work it out, shown as the placeholder; typing replaces it with a
 * flat share of salary (D2), and "use calculated" puts the calculation back.
 */
export function OverrideField({ tax, label }: { tax: Overridable; label: string }) {
  const input = useRef<HTMLInputElement>(null);
  const typed = settings.value.overrides[tax];
  const id = `override-${tax}`;

  const save = (rate: number | undefined) => {
    const others = Object.entries(settings.value.overrides).filter(([key]) => key !== tax);
    updateSettings({
      overrides: Object.fromEntries(rate === undefined ? others : [...others, [tax, rate]]),
    });
  };

  return (
    <span class="rate-field">
      <label for={id} class="visually-hidden">
        {label} rate, in percent
      </label>
      <span class={typed === undefined ? 'rate-wrap' : 'rate-wrap rate-typed'}>
        <input
          ref={input}
          id={id}
          class="rate-input figures"
          inputMode="decimal"
          autoComplete="off"
          placeholder={percentText(calculatedShares.value[tax])}
          defaultValue={typed === undefined ? '' : percentText(typed)}
          onInput={(e) => {
            const percent = readPercent(e.currentTarget, 100);
            save(percent === null ? undefined : percent / 100);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur();
          }}
        />
        <span class="rate-percent figures" aria-hidden="true">
          %
        </span>
      </span>
      {typed === undefined ? (
        <span class="rate-hint">calculated</span>
      ) : (
        <button
          type="button"
          class="rate-reset"
          onClick={() => {
            if (input.current) input.current.value = '';
            save(undefined);
          }}
        >
          use calculated
        </button>
      )}
    </span>
  );
}
