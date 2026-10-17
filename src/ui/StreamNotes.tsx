import { signal } from '@preact/signals';
import { formatDate, formatUsd } from '../lib/format';
import { annual, ssCappedOn, table } from '../lib/model';
import { settings } from '../lib/settings';
import { StateRateField } from './StateRateField';
import './StreamNotes.css';

/** True while the user is changing their state rate; a skin's State label can set it. */
export const editingState = signal(false);

/**
 * What isn't flowing, said under the river rather than drawn in it (D15): the state rate
 * still to answer, and Social Security once it is paid up for the year.
 */
export function StreamNotes() {
  const rate = settings.value.stateRate;
  const editing = editingState.value;
  const capped = ssCappedOn.value;
  const year = String(table.value.taxYear);

  return (
    <div class="notes">
      {rate === null || editing ? (
        <div
          class="note note-ask"
          onFocusIn={() => {
            // Stay open while typing, even once the rate starts the State stream.
            editingState.value = true;
          }}
        >
          <p class="note-title">
            {rate === null ? 'Add your state’s income tax' : 'Your state’s income tax'}
          </p>
          {rate === null && <p class="note-body">Until then, take-home is shown without it.</p>}
          <StateRateField
            autoFocus={editing}
            onDone={() => {
              editingState.value = false;
            }}
          />
        </div>
      ) : (
        rate === 0 && (
          <p class="note note-line">
            No state income tax ·{' '}
            <button
              type="button"
              class="note-link"
              onClick={() => {
                editingState.value = true;
              }}
            >
              change
            </button>
          </p>
        )
      )}

      {capped !== null && (
        <div class="note note-capped">
          <p class="note-title">Social Security is paid up for {year}</p>
          <p class="note-body">
            You reached the wage cap on {formatDate(capped)}, paying the {year} maximum of{' '}
            {formatUsd(annual.value.socialSecurity, 0)}, and your stream sped up. It starts again on Jan 1.
          </p>
        </div>
      )}
    </div>
  );
}
