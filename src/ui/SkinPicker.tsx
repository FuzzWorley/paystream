import { settings, updateSettings } from '../lib/settings';
import { currentSkin, skins } from '../skins';

/**
 * Every skin in the registry; the choice is remembered (D4). In the header it stands alone, so
 * it's labelled for assistive tech only; on Your numbers it sits in a labelled row.
 */
export function SkinPicker({ place }: { place: 'header' | 'card' }) {
  const current = currentSkin.value.id;
  const buttons = (
    <div
      class="toggle skin-toggle"
      role="group"
      {...(place === 'header' ? { 'aria-label': 'Skin' } : { 'aria-labelledby': 'skin-label' })}
    >
      {skins.map((k) => (
        <button
          key={k.id}
          type="button"
          class="toggle-option"
          aria-pressed={k.id === current}
          onClick={() => {
            if (settings.value.skin !== k.id) updateSettings({ skin: k.id });
          }}
        >
          {k.name}
        </button>
      ))}
    </div>
  );
  if (place === 'header') return buttons;
  return (
    <div class="card-row">
      <span id="skin-label">Skin</span>
      {buttons}
    </div>
  );
}
