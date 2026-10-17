import '@fontsource/instrument-sans/latin-400.css';
import '@fontsource/instrument-sans/latin-600.css';
import '@fontsource/instrument-serif/latin-400-italic.css';
import '@fontsource/jetbrains-mono/latin-400.css';
import './tokens.css';
import type { SkinModule } from '../types';
import { Hero } from './Hero';

/** A drop landing in water: a soft sine that falls in pitch. */
function voice(ctx: AudioContext, at: number): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(1100, at);
  osc.frequency.exponentialRampToValueAtTime(420, at + 0.12);
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(0.12, at + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.18);
  osc.connect(gain).connect(ctx.destination);
  osc.start(at);
  osc.stop(at + 0.2);
}

export const riverModule: SkinModule = { Hero, voice };
