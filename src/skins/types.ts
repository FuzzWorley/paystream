import type { ComponentType } from 'preact';

/** What a skin brings once loaded: its fonts, tokens and CSS come in with the module. */
export interface SkinModule {
  /** The skin's rendering of the streams; it reads lib/model and owns nothing else (D4). */
  Hero: ComponentType;
  /** The sound of one coin reaching you, played at `at` (AudioContext time). */
  voice: (ctx: AudioContext, at: number) => void;
}

export interface Skin {
  id: string;
  name: string;
  /** Colour schemes this skin is designed for; screenshots cover each (D9). */
  schemes: readonly ('dark' | 'light')[];
  /** Loads the skin's module, so one skin's fonts never download for another's users. */
  load: () => Promise<SkinModule>;
}
