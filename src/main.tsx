import { render } from 'preact';
import './styles/tokens.css';
import './styles/base.css';
import { startClock } from './lib/clock';
import { settings } from './lib/settings';
import { defaultSkin, skins } from './skins';
import { Stream } from './screens/Stream';

const skin = skins.find((k) => k.id === settings.peek().skin) ?? defaultSkin;
document.documentElement.dataset.skin = skin.id;

startClock();
const root = document.getElementById('app');
if (root) render(<Stream />, root);
