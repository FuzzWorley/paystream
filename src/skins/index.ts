// The registry: the one shared file a new skin touches (D4).
import { computed, effect, signal } from '@preact/signals';
import { settings } from '../lib/settings';
import { arcade } from './arcade';
import { river } from './river';
import { riverModule } from './river/module';
import type { Skin, SkinModule } from './types';

export type { Skin, SkinModule } from './types';

export const skins: readonly Skin[] = [river, arcade];
export const defaultSkin: Skin = river;

/** The skin the user chose, or the default for a first visit or a skin that no longer exists. */
export const currentSkin = computed(() => skins.find((k) => k.id === settings.value.skin) ?? defaultSkin);

/**
 * The skin on screen. It changes only once the chosen skin's module (fonts, tokens, CSS) has
 * loaded, so a switch never shows one skin's layout in another's half-loaded styles.
 */
export const activeSkin = signal<{ skin: Skin; module: SkinModule }>({ skin: river, module: riverModule });

/** Follows the user's choice; resolves once the first one is on screen, so the first paint is right. */
export function followSkinChoice(): Promise<void> {
  return new Promise((ready) => {
    effect(() => {
      const skin = currentSkin.value;
      if (skin.id === activeSkin.peek().skin.id) {
        ready();
        return;
      }
      skin
        .load()
        .then((module) => {
          // A quicker second switch wins over a slow first one.
          if (currentSkin.peek().id === skin.id) activeSkin.value = { skin, module };
        })
        .catch(() => {
          // Offline before the chunk was cached: stay in the skin already showing.
        })
        .finally(ready);
    });
  });
}
