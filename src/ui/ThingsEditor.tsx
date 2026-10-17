import { useRef, useState } from 'preact/hooks';
import { formatDigits } from '../lib/format';
import { takeHomeTime } from '../lib/model';
import {
  MAX_SALARY,
  MAX_THING_NAME,
  MAX_THINGS,
  settings,
  updateSettings,
  type Thing,
} from '../lib/settings';

interface Row {
  /** Stable while editing, so removing a row never shifts another row's half-typed text. */
  id: number;
  name: string;
  amount: string;
}

let nextId = 0;
const toRow = (t: Thing): Row => ({
  id: nextId++,
  name: t.name,
  amount: t.amount >= 1000 ? formatDigits(t.amount) : String(t.amount),
});
const amountOf = (text: string) => Number.parseFloat(text.replace(/,/g, ''));

/** Rename, re-price, add and remove your things (D6). A row saves once its amount is a price. */
export function ThingsEditor() {
  const [rows, setRows] = useState<Row[]>(() => settings.peek().things.map(toRow));
  const list = useRef<HTMLUListElement>(null);

  const save = (next: Row[]) => {
    setRows(next);
    updateSettings({
      things: next.flatMap((r) => {
        const amount = amountOf(r.amount);
        return amount >= 0.01 ? [{ name: r.name, amount: Math.min(amount, MAX_SALARY) }] : [];
      }),
    });
  };
  const change = (id: number, patch: Partial<Row>) => {
    save(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  return (
    <div class="things-editor">
      {rows.length > 0 && (
        <ul ref={list} class="things-rows">
          {rows.map((r) => {
            const amount = amountOf(r.amount);
            const every = amount >= 0.01 ? takeHomeTime(amount) : null;
            return (
              <li key={r.id} class="things-row">
                <input
                  class="field things-name"
                  aria-label="Thing"
                  placeholder="A week of groceries"
                  maxLength={MAX_THING_NAME}
                  value={r.name}
                  onInput={(e) => {
                    change(r.id, { name: e.currentTarget.value });
                  }}
                />
                <span class="field things-amount">
                  <span aria-hidden="true">$</span>
                  <input
                    class="figures"
                    aria-label={`Price of ${r.name || 'this thing'}, in dollars`}
                    inputMode="decimal"
                    autoComplete="off"
                    placeholder="0"
                    value={r.amount}
                    onInput={(e) => {
                      change(r.id, { amount: e.currentTarget.value.replace(/[^\d.,]/g, '') });
                    }}
                  />
                </span>
                <button
                  type="button"
                  class="things-remove"
                  aria-label={`Remove ${r.name || 'this thing'}`}
                  onClick={() => {
                    save(rows.filter((x) => x.id !== r.id));
                  }}
                >
                  ×
                </button>
                <span class="things-every figures">
                  {every ? `every ${every}` : amount >= 0.01 ? 'never, at this rate' : 'add a price'}
                </span>
              </li>
            );
          })}
        </ul>
      )}
      <button
        type="button"
        class="button-quiet"
        disabled={rows.length >= MAX_THINGS}
        onClick={() => {
          setRows([...rows, { id: nextId++, name: '', amount: '' }]);
          // Focus the new row's name once it renders.
          requestAnimationFrame(() => {
            list.current?.querySelector<HTMLInputElement>('li:last-child .things-name')?.focus();
          });
        }}
      >
        + Add a thing
      </button>
    </div>
  );
}
