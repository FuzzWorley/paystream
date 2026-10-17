import { effect } from '@preact/signals';
import { render } from 'preact';
import './styles/tokens.css';
import './styles/base.css';
import './styles/shell.css';
import { App } from './App';
import { startClock } from './lib/clock';
import { startCoinSounds } from './lib/sound';
import { activeSkin, followSkinChoice } from './skins';

// Tokens are scoped to [data-skin], so switching skins restyles every screen at once.
effect(() => {
  const root = document.documentElement;
  root.dataset.skin = activeSkin.value.skin.id;
  // The phone's status bar matches the skin's background.
  const bg = getComputedStyle(root).getPropertyValue('--bg').trim();
  if (bg) document.querySelector('meta[name="theme-color"]')?.setAttribute('content', bg);
});

startClock();
startCoinSounds(() => activeSkin.value.module.voice);

const app = document.getElementById('app');
void followSkinChoice().then(() => {
  if (app) render(<App />, app);
});
