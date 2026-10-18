/** A skin's colours as plain strings: a canvas can't read CSS variables, so the screen hands these in. */
export interface Palette {
  bg: string;
  surface: string;
  line: string;
  text: string;
  muted: string;
  /** By stream id: you, federal, socialSecurity, state, medicare. */
  streams: Record<string, string>;
  font: string;
}
