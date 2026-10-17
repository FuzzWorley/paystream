// The registry: the one shared file a new skin touches (D4).
import { river } from './river';
import type { Skin } from './types';

export type { Skin } from './types';

export const skins: readonly Skin[] = [river];
export const defaultSkin: Skin = river;
