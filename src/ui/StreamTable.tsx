import { STREAMS } from '../core/types';
import { formatUsd } from '../lib/format';
import { annual, STREAM_LABELS } from '../lib/model';

/**
 * The streams as a table for screen readers. It changes only when the inputs do, so it is
 * never announced per tick.
 */
export function StreamTable() {
  const year = annual.value;
  return (
    <table class="visually-hidden">
      <caption>Where your pay goes each year</caption>
      <thead>
        <tr>
          <th scope="col">Stream</th>
          <th scope="col">Per year</th>
        </tr>
      </thead>
      <tbody>
        {STREAMS.map((s) => (
          <tr key={s}>
            <th scope="row">{STREAM_LABELS[s]}</th>
            <td>{formatUsd(year[s])}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
