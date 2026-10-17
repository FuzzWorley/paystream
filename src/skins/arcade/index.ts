import type { Skin } from '../types';

// Loaded on demand: River users never download Press Start 2P (spec §4).
export const arcade: Skin = {
  id: 'arcade',
  name: 'Arcade',
  schemes: ['dark'],
  load: () => import('./module').then((m) => m.arcadeModule),
};
