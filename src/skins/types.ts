import type { ComponentType } from 'preact';

export interface Skin {
  id: string;
  name: string;
  /** Colour schemes this skin is designed for; screenshots cover each (D9). */
  schemes: readonly ('dark' | 'light')[];
  /** The skin's rendering of the streams; it reads lib/model and owns nothing else (D4). */
  Hero: ComponentType;
}
