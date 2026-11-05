import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { PointLight } from '@babylonjs/core/Lights/pointLight';
import type { Scene } from '@babylonjs/core/scene';
import { LevelBuilder, Kit } from './kit';
import type { Level } from './level';

/**
 * Квартира: 10×8 метров, четыре комнаты, одна лампа на две.
 * Всё, что здесь есть, — обычное. Поэтому и страшно.
 */
export function buildFlat(scene: Scene, kit: Kit): Level {
  const b = new LevelBuilder(scene, kit, 'flat');
  const H = 2.7;

  // пол и потолок
  b.floor(-5, -4, 5, 4, 0, 'linoleum');
  b.ceiling(-5, -4, 5, 4, H, 'concrete');
  // плитка на кухне — чуть выше пола, чтобы не мерцала
  b.box('kitchen-tile', [4.6, 0.02, 3.6], [2.5, 0.011, 2.0], 'tile');

  // внешние стены
  b.wallX(-5, 5, -4, 0, H, 'wallpaper');
  b.wallXwithDoor(-5, 5, 4, 0, H, -3.2, -2.0, 2.1, 'wallpaper', 0.22);
  b.wallZ(-4, 4, -5, 0, H, 'wallpaper');
  b.wallZ(-4, 4, 5, 0, H, 'wallpaper');

  // внутренние перегородки
  b.wallXwithDoor(-5, 5, 0, 0, H, -1.0, 0.2, 2.1, 'wallpaper', 0.14);
  b.wallZwithDoor(-4, 0, 0, 0, H, -2.6, -1.4, 2.1, 'wallpaper', 0.14);

  // — гостиная ————————————————————————————
  b.box('sofa', [2.4, 0.85, 0.9], [-3.3, 0.43, -3.2], 'wood');
  b.box('sofa-back', [2.4, 0.7, 0.2], [-3.3, 0.85, -3.6], 'wood');
  b.box('table', [1.2, 0.05, 0.8], [-1.6, 0.72, -1.6], 'wood');
  b.box('table-leg', [0.1, 0.72, 0.1], [-2.1, 0.36, -1.9], 'wood');
  b.box('table-leg2', [0.1, 0.72, 0.1], [-1.1, 0.36, -1.3], 'wood');
  b.box('tv', [0.95, 0.6, 0.12], [-4.7, 1.25, -1.2], 'metal');
  b.box('carpet', [2.6, 0.015, 1.9], [-3.0, 0.015, -1.9], 'wood');
  b.box('wardrobe', [1.1, 1.95, 0.55], [-4.4, 0.97, -3.4], 'wood');

  // — спальня ————————————————————————————
  b.box('bed', [1.6, 0.5, 2.0], [3.4, 0.25, -3.0], 'wood');
  b.box('bed-head', [1.6, 0.7, 0.15], [3.4, 0.35, -3.95], 'wood');
  b.box('bed-cover', [1.5, 0.12, 1.9], [3.4, 0.55, -3.0], 'wallpaper');
  b.box('wardrobe2', [1.3, 2.0, 0.55], [4.55, 1.0, -1.1], 'wood');
  b.box('nightstand', [0.45, 0.55, 0.45], [2.3, 0.28, -3.7], 'wood');
  b.lamp([2.3, 2.45, -2.2], new Color3(1, 0.84, 0.62), 7, 9);

  // — прихожая ————————————————————————————
  b.box('hall-wardrobe', [1.6, 2.0, 0.55], [-4.4, 1.0, 1.2], 'wood');
  b.box('trellis', [1.0, 0.06, 0.35], [-4.75, 1.35, 2.6], 'wood');
  b.box('mirror', [0.8, 1.1, 0.04], [-4.88, 1.35, 2.6], 'glass');
  b.box('shoe-rack', [0.9, 0.4, 0.35], [-1.2, 0.2, 3.5], 'wood');

  // — кухня ——————————————————————————————
  b.box('kitchen-table', [1.1, 0.05, 0.75], [2.0, 0.74, 2.0], 'wood');
  b.box('kitchen-table-leg', [0.08, 0.74, 0.08], [1.5, 0.37, 1.7], 'wood');
  b.box('kitchen-table-leg2', [0.08, 0.74, 0.08], [2.5, 0.37, 2.3], 'wood');
  b.box('fridge', [0.72, 1.85, 0.72], [4.5, 0.93, 1.0], 'metal');
  b.box('stove', [0.62, 0.9, 0.62], [4.5, 0.45, 2.6], 'metal');
  b.box('sink', [0.9, 0.12, 0.55], [1.2, 0.88, 3.6], 'metal');
  b.lamp([2.2, 2.45, 2.2], new Color3(1, 0.9, 0.72), 6, 8);
  b.lamp([-3.0, 2.45, -2.0], new Color3(1, 0.82, 0.6), 7, 9);
  b.lamp([-3.0, 2.45, 2.4], new Color3(1, 0.86, 0.66), 5, 7);

  // — окна ————————————————————————————————
  windowOnNorthWall(scene, b, kit, -2.6, -3.88);
  windowOnNorthWall(scene, b, kit, 2.6, -3.88);
  windowOnSouthWall(scene, b, kit, 2.4, 3.88);

  // — входная дверь ————————————————————————
  b.box('front-door', [1.15, 2.05, 0.09], [-2.6, 1.02, 3.92], 'door');
  b.box('front-door-frame', [1.35, 2.2, 0.12], [-2.6, 1.1, 4.0], 'wood');
  b.box('front-door-handle', [0.06, 0.06, 0.12], [-3.05, 1.05, 3.84], 'metal');

  const setHeat = stoveFire(scene, b);

  return {
    id: 'flat',
    title: 'Квартира',
    root: b.root,
    col: b.col,
    spawn: { x: 2.6, y: 0, z: -1.1, yaw: Math.PI },
    ambientC: 9,
    outdoors: false,
    holdsHeat: true,
    setHeat,
    spots: [
      { id: 'flat.window', position: [-2.6, 1.6, -3.7], radius: 1.4, label: 'Окно', kind: 'examine' },
      { id: 'flat.bed', position: [3.4, 0.7, -3.0], radius: 1.4, label: 'Кровать', kind: 'sleep' },
      { id: 'flat.stove', position: [4.5, 0.95, 2.6], radius: 1.3, label: 'Печь', kind: 'use' },
      { id: 'flat.wardrobe', position: [-4.4, 1.1, -3.2], radius: 1.3, label: 'Шкаф в комнате', kind: 'loot' },
      { id: 'flat.hall-wardrobe', position: [-4.4, 1.1, 1.4], radius: 1.4, label: 'Шкаф в прихожей', kind: 'loot' },
      { id: 'flat.fridge', position: [4.4, 1.0, 1.1], radius: 1.3, label: 'Холодильник', kind: 'loot' },
      { id: 'flat.table', position: [-1.6, 0.8, -1.6], radius: 1.3, label: 'Стол', kind: 'loot' },
      { id: 'flat.kitchen-table', position: [2.0, 0.8, 2.0], radius: 1.3, label: 'Кухонный стол', kind: 'loot' },
      { id: 'flat.trellis', position: [-4.7, 1.3, 2.7], radius: 1.2, label: 'Трельяж', kind: 'loot' },
      { id: 'flat.tv', position: [-4.6, 1.2, -1.2], radius: 1.3, label: 'Телевизор', kind: 'examine' },
      { id: 'flat.door', position: [-2.6, 1.2, 3.75], radius: 1.5, label: 'Входная дверь', kind: 'door', target: 'stairwell' },
    ],
  };
}

function windowOnNorthWall(scene: Scene, b: LevelBuilder, kit: Kit, x: number, z: number): void {
  const mat = kit.mat('glass');
  const glass = MeshBuilder.CreatePlane('window', { width: 1.5, height: 1.4 }, scene);
  glass.position.set(x, 1.75, z);
  glass.material = kit.windowLight();
  glass.parent = b.root;
  glass.isPickable = false;
  frame(b, x, 1.75, z, 1);
}

function windowOnSouthWall(scene: Scene, b: LevelBuilder, kit: Kit, x: number, z: number): void {
  const glass = MeshBuilder.CreatePlane('window', { width: 1.5, height: 1.4 }, scene);
  glass.position.set(x, 1.75, z);
  glass.rotation.y = Math.PI;
  glass.material = kit.windowLight();
  glass.parent = b.root;
  glass.isPickable = false;
  frame(b, x, 1.75, z, -1);
}

function frame(b: LevelBuilder, x: number, y: number, z: number, dir: number): void {
  const dz = z + 0.07 * dir;
  b.box('win-frame', [1.72, 0.09, 0.12], [x, y + 0.74, dz], 'wood');
  b.box('win-frame', [1.72, 0.09, 0.12], [x, y - 0.74, dz], 'wood');
  b.box('win-frame', [0.09, 1.58, 0.12], [x - 0.81, y, dz], 'wood');
  b.box('win-frame', [0.09, 1.58, 0.12], [x + 0.81, y, dz], 'wood');
  b.box('win-sill', [1.86, 0.07, 0.3], [x, y - 0.8, z + 0.16 * dir], 'wood');
  b.box('win-cross', [0.06, 1.42, 0.08], [x, y, dz - 0.01 * dir], 'wood');
  b.box('win-cross2', [1.5, 0.05, 0.08], [x, y + 0.18, dz - 0.01 * dir], 'wood');
}

/**
 * Огонь в печи. Пока топка горит — оранжевый свет на кухне и раскалённая
 * дверца; гаснет вместе с топливом. Самый заметный признак жизни в доме.
 */
function stoveFire(scene: Scene, b: LevelBuilder): (lit: boolean) => void {
  // Свет ставим перед дверцей, а не внутри топки: иначе он светит в стену
  // за печью и на кухне не видно, что дом топят.
  const light = new PointLight('stove-fire', new Vector3(4.5, 0.62, 3.05), scene);
  light.diffuse = new Color3(1, 0.52, 0.2);
  light.specular = new Color3(1, 0.4, 0.12);
  light.range = 6;
  light.intensity = 3.2;
  light.parent = b.root;
  light.setEnabled(false);

  const glow = new StandardMaterial('stove-glow', scene);
  glow.disableLighting = true;
  glow.diffuseColor = new Color3(0, 0, 0);
  glow.specularColor = new Color3(0, 0, 0);
  glow.emissiveColor = new Color3(1, 0.36, 0.08);
  const door = b.box('stove-door', [0.42, 0.28, 0.04], [4.5, 0.5, 2.93], undefined, {
    material: glow,
  });
  door.isVisible = false;

  return (lit: boolean) => {
    light.setEnabled(lit);
    door.isVisible = lit;
  };
}
