import '@fontsource/press-start-2p/latin-400.css';
import '@fontsource/vt323/latin-400.css';
import './tokens.css';
import type { SkinModule } from '../types';
import { Hero } from './Hero';

/** The cabinet's coin: two square-wave notes, B5 then E6. */
function voice(ctx: AudioContext, at: number): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'square';
  osc.frequency.setValueAtTime(988, at);
  osc.frequency.setValueAtTime(1319, at + 0.06);
  gain.gain.setValueAtTime(0.05, at);
  gain.gain.setValueAtTime(0.05, at + 0.16);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.3);
  osc.connect(gain).connect(ctx.destination);
  osc.start(at);
  osc.stop(at + 0.32);
}

export const arcadeModule: SkinModule = { Hero, voice };
