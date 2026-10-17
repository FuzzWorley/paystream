import { render } from 'preact';
import './styles/tokens.css';
import './styles/base.css';
import { defaultSkin } from './skins';
import { Placeholder } from './screens/Placeholder';

document.documentElement.dataset.skin = defaultSkin.id;

const root = document.getElementById('app');
if (root) render(<Placeholder />, root);
