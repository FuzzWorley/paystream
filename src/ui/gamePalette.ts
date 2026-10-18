import type { Palette } from '../games/palette';

const TOKENS: Record<string, string> = {
  you: '--you',
  federal: '--federal',
  socialSecurity: '--social-security',
  state: '--state',
  medicare: '--medicare',
};

/** The active skin's colours, read from its tokens once, for a game's canvas. */
export function gamePalette(): Palette {
  const css = getComputedStyle(document.documentElement);
  const token = (name: string) => css.getPropertyValue(name).trim();
  return {
    bg: token('--bg'),
    surface: token('--surface'),
    line: token('--line'),
    text: token('--text'),
    muted: token('--text-muted'),
    streams: Object.fromEntries(Object.entries(TOKENS).map(([id, name]) => [id, token(name)])),
    font: token('--font-ui') || 'sans-serif',
  };
}

/** Short names for a canvas, by stream id. */
export const GAME_NAMES: Record<string, string> = {
  you: 'YOU',
  federal: 'FED',
  socialSecurity: 'SOC SEC',
  state: 'STATE',
  medicare: 'MED',
};
