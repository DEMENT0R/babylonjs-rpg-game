import type { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import type { LevelCollision } from '../collision';

export type SpotKind = 'loot' | 'examine' | 'door' | 'npc' | 'use' | 'sleep' | 'exit';

/** Точка интереса. Геометрия — в рендере, смысл — в сценарии. */
export interface Spot {
  id: string;
  position: [number, number, number];
  radius: number;
  label: string;
  kind: SpotKind;
  /** Для дверей: куда ведёт. */
  target?: string;
  /** Скрыта, пока не выполнено условие сценария. */
  hidden?: boolean;
}

export interface LevelSpawn {
  x: number;
  y: number;
  z: number;
  yaw: number;
}

export interface Level {
  id: string;
  title: string;
  root: TransformNode;
  col: LevelCollision;
  spawn: LevelSpawn;
  spots: Spot[];
  /** Насколько холодно в этой локации при выключенном отоплении. */
  ambientC: number;
  outdoors: boolean;
  /**
   * Локация держит тепло: её температура считается симуляцией (`Heat`),
   * а `ambientC` — только то, с чего она начинается.
   */
  holdsHeat?: boolean;
  /** Огонь в локации: печь зажигается и гаснет по мере топки. */
  setHeat?: (lit: boolean) => void;
}
