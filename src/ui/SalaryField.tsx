import { formatDigits } from '../lib/format';
import { isExample } from '../lib/model';
import { EXAMPLE_SALARY, settings, updateSettings } from '../lib/settings';

const MAX_DIGITS = 8;

/** Where the caret belongs after reformatting: just past the same number of digits. */
function caretAfterDigits(text: string, digits: number): number {
  let seen = 0;
  for (let i = 0; i < text.length; i++) {
    if (seen === digits) return i;
    if (/\d/.test(text.charAt(i))) seen++;
  }
  return text.length;
}

export function SalaryField() {
  const initial = settings.peek().salary;

  // Streams start as you type: no button (paystream-frontend). Uncontrolled, so reformatting
  // with commas can put the caret back where the user was typing.
  const onInput = (e: Event) => {
    const el = e.currentTarget as HTMLInputElement;
    const caret = el.selectionStart ?? el.value.length;
    const digitsBefore = el.value.slice(0, caret).replace(/\D/g, '').length;
    const digits = el.value
      .replace(/\D/g, '')
      .replace(/^0+(?=\d)/, '')
      .slice(0, MAX_DIGITS);
    const salary = digits ? Number(digits) : null;
    el.value = salary === null ? '' : formatDigits(salary);
    const at = caretAfterDigits(el.value, Math.min(digitsBefore, digits.length));
    el.setSelectionRange(at, at);
    updateSettings({ salary });
  };

  return (
    <div class="salary">
      <label for="salary" class="salary-label">
        Salary
      </label>
      <span class="salary-dollar figures" aria-hidden="true">
        $
      </span>
      <input
        id="salary"
        class="salary-input figures"
        inputMode="numeric"
        autoComplete="off"
        placeholder={formatDigits(EXAMPLE_SALARY)}
        defaultValue={initial === null ? '' : formatDigits(initial)}
        onInput={onInput}
        aria-describedby="salary-note"
      />
      <span id="salary-note" class="salary-note">
        {isExample.value ? (
          <span class="salary-example">Example · type yours</span>
        ) : (
          <>
            <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true">
              <rect x="5" y="11" width="14" height="10" rx="2" />
              <path d="M8 11V8a4 4 0 0 1 8 0v3" />
            </svg>
            Stays in your browser
          </>
        )}
      </span>
    </div>
  );
}
