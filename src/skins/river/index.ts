import type { Skin } from '../types';
import { riverModule } from './module';

// The default skin ships in the main bundle, so a first visit paints without waiting on a chunk.
export const river: Skin = {
  id: 'river',
  name: 'River',
  schemes: ['dark'],
  load: () => Promise.resolve(riverModule),
};
