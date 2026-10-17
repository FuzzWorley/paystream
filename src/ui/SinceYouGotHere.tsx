import { formatElapsed, formatUsd } from '../lib/format';
import { secondsHere, views } from '../lib/model';

export function SinceYouGotHere() {
  let you = 0;
  let taxes = 0;
  for (const v of views.value) {
    if (v.stream === 'you') you = v.earned;
    else taxes += v.earned;
  }
  return (
    <p class="since">
      <span>
        Since you got here <span class="since-time figures">· {formatElapsed(secondsHere.value)}</span>
      </span>
      <span class="figures">
        <span class="since-you">{formatUsd(you, 4)}</span> you · {formatUsd(taxes, 4)} taxes
      </span>
    </p>
  );
}
