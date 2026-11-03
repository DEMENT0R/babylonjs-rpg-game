import { Color3 } from '@babylonjs/core/Maths/math.color';
import type { Scene } from '@babylonjs/core/scene';
import { LevelBuilder, type Kit } from './kit';
import { makePerson } from './person';
import type { Level } from './level';

/**
 * Магазин. Полки в два ряда, касса, витрина выбита, снег лежит на линолеуме.
 * Здесь заканчивается первая часть пути и начинается первый настоящий выбор.
 */
export function buildShop(scene: Scene, kit: Kit): Level {
  const b = new LevelBuilder(scene, kit, 'shop');
  const H = 3.2;
  const X = 5.2;
  const Z = 3.6;

  b.floor(-X, -Z, X, Z, 0, 'linoleum');
  b.ceiling(-X, -Z, X, Z, H, 'stair');

  b.wallZ(-Z, Z, -X, 0, H, 'stair');
  b.wallZwithDoor(-Z, Z, X, 0, H, 1.4, 3.0, 2.2, 'stair', 0.2);
  b.wallX(-X, X, -Z, 0, H, 'stair');
  b.wallXwithDoor(-X, X, Z, 0, H, -2.2, -0.6, 2.4, 'stair', 0.2);

  // выбитая витрина: снег внутрь
  b.box('broken-glass', [1.6, 2.2, 0.05], [-1.4, 1.15, Z - 0.15], 'glass');
  b.box('snow-in', [2.2, 0.06, 1.8], [-1.4, 0.04, Z - 1.2], 'snow');

  // полки
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 3; col++) {
      const x = -2.6 + col * 2.0;
      const z = -1.4 + row * 2.4;
      b.box('shelf', [1.8, 1.6, 0.5], [x, 0.8, z], 'metal');
      b.box('shelf-b', [1.8, 0.06, 0.6], [x, 0.9, z], 'metal');
      b.box('shelf-b', [1.8, 0.06, 0.6], [x, 1.3, z], 'metal');
      // то, что осталось
      if ((row + col) % 2 === 0) {
        b.box('goods', [0.4, 0.3, 0.3], [x - 0.5, 1.05, z], 'wood');
      }
      b.col.walls.push({ x0: x - 0.9, x1: x + 0.9, z0: z - 0.3, z1: z + 0.3 });
    }
  }

  // касса
  b.box('counter', [3.2, 1.0, 0.8], [1.6, 0.5, 1.8], 'wood');
  b.box('register', [0.6, 0.4, 0.5], [0.6, 1.2, 1.8], 'metal');
  b.col.walls.push({ x0: 0.0, x1: 3.2, z0: 1.4, z1: 2.2 });

  // холодильники у дальней стены
  b.box('fridge-case', [2.4, 2.2, 0.7], [-3.6, 1.1, -Z + 0.5], 'glass');

  // аварийный свет: одна лампа над кассой
  b.lamp([1.6, 2.6, 1.2], new Color3(1, 0.78, 0.5), 6, 8);

  makePerson(scene, b.root, -4.2, 0, 0.4, 1.4, { hunched: true });

  // дверь обратно во двор
  b.box('back-door', [1.5, 2.05, 0.09], [X - 0.14, 1.02, 2.2], 'door');

  return {
    id: 'shop',
    title: 'Магазин',
    root: b.root,
    col: b.col,
    spawn: { x: X - 0.8, y: 0, z: 2.2, yaw: -Math.PI / 2 },
    ambientC: -13,
    outdoors: false,
    spots: [
      { id: 'shop.exit', position: [X - 0.5, 1.1, 2.2], radius: 1.4, label: 'Выйти во двор', kind: 'door', target: 'street' },
      { id: 'shop.shelf-a', position: [-2.6, 1.0, -1.4], radius: 1.4, label: 'Полка у стены', kind: 'loot' },
      { id: 'shop.shelf-b', position: [1.4, 1.0, -1.4], radius: 1.4, label: 'Полка с консервами', kind: 'loot' },
      { id: 'shop.shelf-c', position: [-2.6, 1.0, 1.0], radius: 1.4, label: 'Полка у кассы', kind: 'loot' },
      { id: 'shop.counter', position: [1.6, 1.1, 1.5], radius: 1.5, label: 'Касса', kind: 'loot' },
      { id: 'shop.fridge', position: [-3.6, 1.2, -Z + 0.9], radius: 1.6, label: 'Холодильная витрина', kind: 'loot' },
      { id: 'shop.window', position: [-1.4, 1.4, Z - 0.5], radius: 1.5, label: 'Витрина', kind: 'examine' },
      { id: 'shop.man', position: [-4.2, 1.0, 0.4], radius: 2.2, label: 'Человек у полки', kind: 'npc' },
    ],
  };
}

