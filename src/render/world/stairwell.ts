import { Color3 } from '@babylonjs/core/Maths/math.color';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import type { Scene } from '@babylonjs/core/scene';
import { LevelBuilder, Kit } from './kit';
import { makePerson } from './person';
import type { Level } from './level';

/**
 * Подъезд: два пролёта, двенадцать ступеней, одна лампочка на этаже.
 * Холоднее, чем в квартире, и гулко, как в колодце.
 */
export function buildStairwell(scene: Scene, kit: Kit): Level {
  const b = new LevelBuilder(scene, kit, 'stairwell');

  const H = 6.2;
  const X = 1.7;
  const Z_BACK = -5.4;
  const Z_FRONT = 3.2;
  const Y_TOP = 3.0;

  // нижняя и верхняя площадки
  b.floor(-X, 2.0, X, Z_FRONT, 0, 'stair');
  b.floor(-X, Z_BACK, X, -3.0, Y_TOP, 'stair');
  b.ceiling(-X, Z_BACK, X, Z_FRONT, H, 'concrete');

  // стены
  b.wallZ(Z_BACK, Z_FRONT, -X, 0, H, 'stair');
  b.wallZ(Z_BACK, Z_FRONT, X, 0, H, 'stair');
  b.wallXwithDoor(-X, X, Z_BACK, 0, H, -0.55, 0.55, 2.1, 'stair', 0.2);
  b.wallXwithDoor(-X, X, Z_FRONT, 0, H, -0.55, 0.55, 2.1, 'stair', 0.2);

  // лестница: двенадцать ступеней, 5 метров пролёта, 3 метра подъёма
  const steps = 12;
  const run = 5.0 / steps;
  const rise = Y_TOP / steps;
  for (let i = 0; i < steps; i++) {
    const topY = (i + 1) * rise;
    const z = 2.0 - (i + 0.5) * run;
    b.box(`step-${i}`, [X * 2 - 0.1, topY, run + 0.02], [0, topY / 2, z], 'concreteDark');
  }
  b.ramp(-X, -3.0, X, 2.0, Y_TOP, 0, 'z');

  // перила
  for (const side of [-1, 1]) {
    const railZ0 = 2.0;
    const railZ1 = -3.0;
    const rail = MeshBuilder.CreateCylinder(
      'rail',
      { height: 5.2, diameter: 0.05, tessellation: 8 },
      scene,
    );
    rail.position.set(side * (X - 0.25), 1.9, (railZ0 + railZ1) / 2);
    rail.rotation.x = Math.PI / 2;
    rail.rotation.z = Math.atan2(Y_TOP, 5.0) * side;
    rail.material = kit.mat('metal');
    rail.parent = b.root;
    rail.isPickable = false;
  }

  // лифт: заварен, как водится
  b.box('lift-door', [1.1, 2.1, 0.08], [X - 0.06, 1.05, -1.2], 'metal');
  b.box('lift-panel', [0.2, 0.3, 0.06], [X - 0.12, 1.4, -1.9], 'metal');

  // почтовые ящики
  for (let i = 0; i < 6; i++) {
    b.box('mailbox', [0.34, 0.28, 0.12], [-1.2 + i * 0.4, 1.35, Z_BACK + 0.18], 'metal');
  }

  // лампочка на верхней площадке
  b.lamp([0, 3.7, -4.2], new Color3(1, 0.86, 0.62), 9, 9);
  b.lamp([0, 0.75, 2.6], new Color3(1, 0.9, 0.7), 2.2, 5);

  // окна между этажами: единственный дневной свет
  for (const z of [-4.4, 1.2]) {
    for (const y of [2.0, 5.0]) {
      const glow = MeshBuilder.CreatePlane('stair-window', { width: 1.1, height: 1.3 }, scene);
      glow.position.set(X - 0.09, y, z);
      glow.rotation.y = -Math.PI / 2;
      glow.material = kit.windowLight();
      glow.parent = b.root;
      glow.isPickable = false;
    }
  }

  // двери: в квартиру и на улицу
  b.box('flat-door', [1.1, 2.05, 0.09], [0, 1.02, Z_BACK + 0.14], 'door');
  b.box('street-door', [1.1, 2.05, 0.09], [0, 1.02, Z_FRONT - 0.14], 'door');
  b.box('street-door-frame', [1.35, 2.2, 0.12], [0, 1.1, Z_FRONT - 0.06], 'metal');

  // мусор: бутылка, окурок, обломок
  b.box('bottle', [0.07, 0.28, 0.07], [1.1, 0.14, -2.0], 'glass');
  b.box('debris', [0.5, 0.1, 0.3], [-1.2, 0.05, 2.5], 'concreteDark');

  // сосед с третьего: стоит на площадке и держит монтировку
  makePerson(scene, b.root, 1.05, Y_TOP, -2.7, -0.9, { hunched: true, coat: new Color3(0.3, 0.29, 0.27) });

  return {
    id: 'stairwell',
    title: 'Подъезд',
    root: b.root,
    col: b.col,
    spawn: { x: 0, y: Y_TOP, z: -4.6, yaw: 0 },
    ambientC: -5,
    outdoors: false,
    spots: [
      { id: 'stair.flat-door', position: [0, 1.2, Z_BACK + 0.4], radius: 1.3, label: 'Дверь квартиры', kind: 'door', target: 'flat' },
      { id: 'stair.street-door', position: [0, 1.2, Z_FRONT - 0.4], radius: 1.4, label: 'Выйти во двор', kind: 'door', target: 'street' },
      { id: 'stair.mailboxes', position: [-0.2, 1.35, Z_BACK + 0.35], radius: 1.2, label: 'Почтовые ящики', kind: 'loot' },
      { id: 'stair.lift', position: [X - 0.4, 1.05, -1.2], radius: 1.2, label: 'Лифт', kind: 'examine' },
      { id: 'stair.window', position: [X - 0.5, 2.0, -4.4], radius: 1.3, label: 'Окно на лестнице', kind: 'examine' },
      { id: 'stair.neighbor', position: [1.05, Y_TOP + 1.3, -2.7], radius: 2.0, label: 'Сосед', kind: 'npc' },
    ],
  };
}
