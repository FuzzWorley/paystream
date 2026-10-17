export interface Skin {
  id: string;
  name: string;
  /** Colour schemes this skin is designed for; screenshots cover each (D9). */
  schemes: readonly ('dark' | 'light')[];
}
