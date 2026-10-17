import { settings, updateSettings } from '../lib/settings';

/** Off by default; switching it on is the tap browsers need before they play anything. */
export function SoundSwitch() {
  return (
    <label class="card-row" for="sound">
      <span>
        Coin sounds <span class="muted">· as each coin reaches you</span>
      </span>
      <input
        id="sound"
        type="checkbox"
        role="switch"
        class="switch"
        checked={settings.value.sound}
        onChange={(e) => {
          updateSettings({ sound: e.currentTarget.checked });
        }}
      />
    </label>
  );
}
