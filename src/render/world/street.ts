import { Color3 } from '@babylonjs/core/Maths/math.color';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import type { Scene } from '@babylonjs/core/scene';
import { LevelBuilder, Kit } from './kit';
import { PANEL_SERIES, panelHouse } from './panel';
import type { Level } from './level';

/**
 * Двор. Четыре типовые панельки: пятиэтажка, семиэтажка и две девятиэтажки.
 * Снег по колено, детская площадка под сугробом и одна работающая лампа из пяти.
 */
export function buildStreet(scene: Scene, kit: Kit): Level {
  const b = new LevelBuilder(scene, kit, 'street');

  // земля
  b.floor(-45, -16, 45, 34, 0, 'snow');
  // дорога и тротуар
  b.box('road', [70, 0.03, 7], [-2, 0.015, 19], 'asphalt');
  b.box('road-mark', [70, 0.01, 0.2], [-2, 0.03, 19], 'concrete');

  // — дома: типовые серии, 5–9 этажей, окна и балконы этаж в этаж —
  // пятиэтажка слева, отступает от красной линии
  panelHouse(b, kit, {
    series: PANEL_SERIES['1-464'],
    sections: 2,
    seed: 11,
    x: -30,
    z: -19.5,
    balconies: true,
  });
  // наш подъезд — девятиэтажка посередине; дверь ровно на оси x = 0
  panelHouse(b, kit, {
    series: PANEL_SERIES['1-515'],
    sections: 3,
    seed: 5,
    x: 0,
    z: -18,
    balconies: true,
  });
  // семиэтажка справа
  panelHouse(b, kit, {
    series: PANEL_SERIES['panel-7'],
    sections: 2,
    seed: 17,
    x: 30,
    z: -18.8,
    balconies: true,
  });
  // девятиэтажка в глубине двора, торцом к магазину
  panelHouse(b, kit, {
    series: PANEL_SERIES['1-515'],
    sections: 2,
    seed: 23,
    x: 36,
    z: 4,
    yaw: -Math.PI / 2,
    balconies: true,
  });
  noticeBoard(b);

  // — магазин —
  shopShell(b, kit, 16, 4, 28, 16, 4.5);

  // — машины, замёрзшие на месте —
  for (const [x, z, rot] of [
    [-6.5, -7.4, 0],
    [-2.2, -8.1, 0.12],
    [4.8, -7.0, -0.06],
    [11.5, -8.4, 0.04],
  ] as const) {
    car(b, kit, x, z, rot);
  }

  // — дворовые вещи —
  playground(b, kit, -14, 4);
  bins(b, kit, 12, -6);
  transformer(b, kit, -13, 15);
  streetLamp(b, kit, -8, -3, true);
  streetLamp(b, kit, 9, 6, false);
  streetLamp(b, kit, -19, 12, false);
  tree(b, kit, -20, 2);
  tree(b, kit, 2, 10);
  tree(b, kit, 15, 20);

  // сугробы
  for (const [x, z, w, d] of [
    [-9, -10.5, 7, 1.4],
    [9, -10.2, 6, 1.2],
    [-14, 0, 3, 5],
    [14, 2, 4, 3],
  ] as const) {
    b.box('snowdrift', [w, 0.5, d], [x, 0.25, z], 'snow');
  }

  return {
    id: 'street',
    title: 'Двор',
    root: b.root,
    col: b.col,
    spawn: { x: 0, y: 0, z: -10, yaw: 0 },
    ambientC: -29,
    outdoors: true,
    spots: [
      { id: 'street.stair-door', position: [0, 1.0, -10.6], radius: 1.6, label: 'Подъезд', kind: 'door', target: 'stairwell' },
      { id: 'street.shop-door', position: [15.4, 1.0, 10], radius: 1.7, label: 'Магазин', kind: 'door', target: 'shop' },
      { id: 'street.notice', position: [-3.05, 1.6, -11.7], radius: 1.3, label: 'Объявление у подъезда', kind: 'examine' },
      { id: 'street.bins', position: [12, 0.6, -6], radius: 1.6, label: 'Мусорные баки', kind: 'loot' },
      { id: 'street.car1', position: [-6.5, 0.8, -7.4], radius: 2.0, label: 'Машина', kind: 'loot' },
      { id: 'street.car2', position: [4.8, 0.8, -7.0], radius: 2.0, label: 'Машина', kind: 'loot' },
      { id: 'street.playground', position: [-14, 0.6, 4], radius: 2.2, label: 'Детская площадка', kind: 'examine' },
      { id: 'street.lamp', position: [-8, 2.4, -3], radius: 2.0, label: 'Фонарь', kind: 'examine' },
      { id: 'street.transformer', position: [-13, 1.0, 15], radius: 1.8, label: 'Трансформаторная будка', kind: 'loot' },
    ],
  };
}

/** Объявление на стене нашего подъезда, между окнами первого этажа. */
function noticeBoard(b: LevelBuilder): void {
  b.box('notice', [0.7, 0.5, 0.03], [-3.05, 1.6, -11.86], 'wood');
}

function shopShell(b: LevelBuilder, kit: Kit, x0: number, z0: number, x1: number, z1: number, h: number): void {
  const mat = kit.mat('concreteDark');
  b.box('shop-roof', [x1 - x0, 0.3, z1 - z0], [(x0 + x1) / 2, h + 0.15, (z0 + z1) / 2], 'concreteDark');
  // стены с витриной
  b.wallZ(z0, z1, x0, 0, h, 'concreteDark', 0.25);
  b.wallX(x0, x1, z0, 0, h, 'concreteDark', 0.25);
  b.wallX(x0, x1, z1, 0, h, 'concreteDark', 0.25);
  b.wallZwithDoor(z0, z1, x1, 0, h, 9.2, 10.8, 2.2, 'concreteDark', 0.25);
  // вывеска
  b.box('sign', [4.2, 0.9, 0.12], [(x0 + x1) / 2 - 1, h - 0.9, z0 - 0.2], undefined, { material: mat });
}

function car(b: LevelBuilder, kit: Kit, x: number, z: number, rot: number): void {
  const body = b.box('car', [1.8, 0.7, 4.2], [x, 0.55, z], 'metal');
  body.rotation.y = rot;
  const cabin = b.box('car-cabin', [1.6, 0.6, 2.0], [x, 1.15, z - 0.1], 'glass');
  cabin.rotation.y = rot;
  const snowCap = b.box('car-snow', [1.7, 0.14, 3.4], [x, 1.0, z], 'snow');
  snowCap.rotation.y = rot;
  b.col.walls.push({ x0: x - 1.1, x1: x + 1.1, z0: z - 2.3, z1: z + 2.3 });
}

function playground(b: LevelBuilder, kit: Kit, x: number, z: number): void {
  b.box('sandbox', [3.2, 0.35, 3.2], [x, 0.17, z], 'wood');
  b.box('sandbox-snow', [2.9, 0.12, 2.9], [x, 0.38, z], 'snow');
  // горка
  b.box('slide-base', [0.9, 1.6, 0.9], [x + 2.6, 0.8, z], 'metal');
  const slide = b.box('slide', [0.7, 0.1, 2.2], [x + 2.6, 1.2, z - 1.3], 'metal');
  slide.rotation.x = -0.62;
  // качели
  b.box('swing-frame', [0.12, 2.4, 0.12], [x - 2.4, 1.2, z - 1.4], 'metal');
  b.box('swing-frame', [0.12, 2.4, 0.12], [x - 2.4, 1.2, z + 1.4], 'metal');
  b.box('swing-bar', [0.1, 0.1, 2.9], [x - 2.4, 2.36, z], 'metal');
  b.box('swing-seat', [0.45, 0.06, 0.3], [x - 2.4, 0.62, z], 'wood');
  b.col.walls.push({ x0: x - 3.2, x1: x + 3.2, z0: z - 1.9, z1: z + 1.9 });
  void kit;
}

function bins(b: LevelBuilder, kit: Kit, x: number, z: number): void {
  for (let i = 0; i < 3; i++) {
    b.box('bin', [1.0, 1.1, 0.8], [x + i * 1.15, 0.55, z], 'metal');
    b.box('bin-lid', [1.05, 0.08, 0.85], [x + i * 1.15, 1.14, z], 'metal');
  }
  b.box('bin-snow', [3.6, 0.2, 1.0], [x + 1.15, 1.2, z], 'snow');
  b.col.walls.push({ x0: x - 0.6, x1: x + 2.9, z0: z - 0.5, z1: z + 0.5 });
  void kit;
}

function transformer(b: LevelBuilder, kit: Kit, x: number, z: number): void {
  b.box('transformer', [3.0, 2.8, 2.2], [x, 1.4, z], 'concreteDark');
  b.box('transformer-door', [0.9, 1.9, 0.08], [x - 1.55, 0.95, z], 'metal');
  b.col.walls.push({ x0: x - 1.6, x1: x + 1.6, z0: z - 1.2, z1: z + 1.2 });
  void kit;
}

function streetLamp(b: LevelBuilder, kit: Kit, x: number, z: number, lit: boolean): void {
  const pole = MeshBuilder.CreateCylinder('lamp-pole', { height: 6.4, diameter: 0.16, tessellation: 8 }, b.root.getScene());
  pole.position.set(x, 3.2, z);
  pole.material = kit.mat('metal');
  pole.parent = b.root;
  pole.isPickable = false;

  const head = b.box('lamp-head', [0.5, 0.16, 0.9], [x, 6.4, z + 0.45], 'metal');
  void head;
  if (lit) {
    b.lamp([x, 6.28, z + 0.45], new Color3(1, 0.82, 0.58), 12, 18);
  }
  b.col.walls.push({ x0: x - 0.2, x1: x + 0.2, z0: z - 0.2, z1: z + 0.2 });
}

function tree(b: LevelBuilder, kit: Kit, x: number, z: number): void {
  const trunk = MeshBuilder.CreateCylinder('trunk', { height: 5.5, diameterTop: 0.12, diameterBottom: 0.28, tessellation: 7 }, b.root.getScene());
  trunk.position.set(x, 2.75, z);
  trunk.material = kit.mat('wood');
  trunk.parent = b.root;
  trunk.isPickable = false;
  for (let i = 0; i < 4; i++) {
    const branch = MeshBuilder.CreateCylinder('branch', { height: 1.8, diameterTop: 0.03, diameterBottom: 0.09, tessellation: 5 }, b.root.getScene());
    branch.position.set(x + Math.cos(i * 2.1) * 0.5, 4.2 + i * 0.35, z + Math.sin(i * 2.1) * 0.5);
    branch.rotation.z = Math.cos(i * 1.7) * 0.9;
    branch.rotation.x = Math.sin(i * 1.3) * 0.9;
    branch.material = kit.mat('wood');
    branch.parent = b.root;
    branch.isPickable = false;
  }
  b.col.walls.push({ x0: x - 0.35, x1: x + 0.35, z0: z - 0.35, z1: z + 0.35 });
}

/** Общий шум для будущих пропов: заглушка, чтобы дерево не висело в воздухе. */
export type { Mesh };
