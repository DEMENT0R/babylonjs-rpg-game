import { Color3 } from '@babylonjs/core/Maths/math.color';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import type { Scene } from '@babylonjs/core/scene';
import { LevelBuilder, Kit } from './kit';
import { makePerson } from './person';
import type { Level } from './level';

/** Этажей в нашем подъезде столько же, сколько в корпусе. */
const FLOORS = 9;
/** Высота этажа: площадка одного этажа ровно над площадкой другого. */
const H = 2.8;
const HALF = H / 2;

const X = 1.7;
const Z_FRONT = 3.0;
const Z_BACK = -5.6;
/** Задняя кромка передней площадки и передняя кромка междуэтажной. */
const Z_LAND_FRONT = 1.0;
const Z_LAND_BACK = -3.6;

const STEPS = 8;
const RISE = HALF / STEPS;
const RUN = (Z_LAND_FRONT - Z_LAND_BACK) / STEPS;

const FLIGHT_INNER = 0.2;
const FLIGHT_OUTER = 1.65;
const FLIGHT_W = FLIGHT_OUTER - FLIGHT_INNER;
const FLIGHT_CX = (FLIGHT_OUTER + FLIGHT_INNER) / 2;

const TOP = FLOORS * H;
const RAIL_ANGLE = Math.atan2(HALF, Z_LAND_FRONT - Z_LAND_BACK);
const RAIL_LEN = Math.hypot(HALF, Z_LAND_FRONT - Z_LAND_BACK);

/**
 * Подъезд девятиэтажки: две маршевые лестницы на этаж, одинаковые площадки
 * и двери на каждом этаже. Можно подняться с первого этажа на девятый,
 * зайти в квартиру и спуститься обратно во двор.
 */
export function buildStairwell(scene: Scene, kit: Kit): Level {
  const b = new LevelBuilder(scene, kit, 'stairwell');

  // — коробка шахты —
  b.wallZ(Z_BACK, Z_FRONT, -X, 0, TOP, 'stair', 0.2);
  b.wallZ(Z_BACK, Z_FRONT, X, 0, TOP, 'stair', 0.2);
  b.wallX(-X, X, Z_BACK, 0, TOP, 'stair', 0.2);
  b.wallX(-X, X, Z_FRONT, 0, TOP, 'stair', 0.2);
  b.ceiling(-X, Z_BACK, X, Z_FRONT, TOP, 'concrete');

  // — этажи: передняя площадка, дверь, лифт, плафон —
  for (let k = 0; k < FLOORS; k++) {
    const y = k * H;
    b.floor(-X, Z_LAND_FRONT, X, Z_FRONT, y, 'stair');

    // Дверь на площадке. На девятом — наша квартира, на первом — улица.
    b.box('stair-door', [1.1, 2.05, 0.09], [0, y + 1.02, Z_FRONT - 0.14], 'door');
    b.box('stair-door-frame', [1.35, 2.2, 0.12], [0, y + 1.1, Z_FRONT - 0.08], 'metal');

    // Лифт заварен на всех этажах, но дверь и кнопка на месте.
    b.box('lift-door', [0.08, 2.1, 1.0], [X - 0.09, y + 1.05, Z_LAND_FRONT + 1.0], 'metal');
    b.box('lift-panel', [0.06, 0.3, 0.18], [X - 0.13, y + 1.4, Z_LAND_FRONT + 0.45], 'metal');

    // Плафон под перекрытием: на четырёх этажах он ещё горит.
    b.box('lamp-fixture', [0.34, 0.06, 0.34], [0, y + 2.7, Z_FRONT - 0.9], 'metal');
  }
  b.box('exit-sign', [0.6, 0.18, 0.04], [0, 2.35, Z_FRONT - 0.16], 'metal');

  // — междуэтажные площадки и марши —
  for (let k = 0; k < FLOORS - 1; k++) {
    const y = k * H;
    const mid = y + HALF;

    b.floor(-X, Z_BACK, X, Z_LAND_BACK, mid, 'stair');

    // Окно между этажами: единственный дневной свет в шахте.
    const glow = MeshBuilder.CreatePlane('stair-window', { width: 1.1, height: 1.3 }, scene);
    glow.position.set(X - 0.11, mid + 1.55, (Z_BACK + Z_LAND_BACK) / 2);
    glow.rotation.y = -Math.PI / 2;
    glow.material = kit.windowLight();
    glow.parent = b.root;
    glow.isPickable = false;

    // Левый марш: с передней площадки этажа вверх на междуэтажную.
    for (let i = 0; i < STEPS; i++) {
      const top = y + (i + 1) * RISE;
      const z = Z_LAND_FRONT - (i + 0.5) * RUN;
      const bottom = y - 0.25;
      b.box(
        `step-${k}-l-${i}`,
        [FLIGHT_W, top - bottom, RUN + 0.02],
        [-FLIGHT_CX, (top + bottom) / 2, z],
        'concreteDark',
      );
    }
    b.ramp(-FLIGHT_OUTER, Z_LAND_BACK, -FLIGHT_INNER, Z_LAND_FRONT, mid, y, 'z');

    // Правый марш: с междуэтажной площадки вверх на следующий этаж.
    for (let i = 0; i < STEPS; i++) {
      const top = mid + (i + 1) * RISE;
      const z = Z_LAND_BACK + (i + 0.5) * RUN;
      const bottom = mid - 0.25;
      b.box(
        `step-${k}-r-${i}`,
        [FLIGHT_W, top - bottom, RUN + 0.02],
        [FLIGHT_CX, (top + bottom) / 2, z],
        'concreteDark',
      );
    }
    b.ramp(FLIGHT_INNER, Z_LAND_BACK, FLIGHT_OUTER, Z_LAND_FRONT, mid, y + H, 'z');

    // Поручни по внутренним краям маршей.
    const railL = b.box(
      'stair-rail',
      [0.05, 0.06, RAIL_LEN],
      [-FLIGHT_INNER, (y + mid) / 2 + 0.95, (Z_LAND_FRONT + Z_LAND_BACK) / 2],
      'metal',
    );
    railL.rotation.x = RAIL_ANGLE;

    const railR = b.box(
      'stair-rail',
      [0.05, 0.06, RAIL_LEN],
      [FLIGHT_INNER, (mid + y + H) / 2 + 0.95, (Z_LAND_FRONT + Z_LAND_BACK) / 2],
      'metal',
    );
    railR.rotation.x = -RAIL_ANGLE;
  }

  // — безопасность: в шахту нельзя шагнуть с площадки —
  // центральный просвет между маршами
  b.col.walls.push({ x0: -0.06, x1: 0.06, z0: Z_LAND_BACK, z1: Z_LAND_FRONT });
  // На первом этаже справа марша вверх нет, на девятом слева уже нет.
  // Ограждения действуют только на своей высоте, иначе перекрыли бы марши.
  b.col.walls.push({
    x0: 0,
    x1: X,
    z0: Z_LAND_FRONT - 0.06,
    z1: Z_LAND_FRONT + 0.06,
    y0: -0.1,
    y1: 1.0,
  });
  const topY = (FLOORS - 1) * H;
  b.col.walls.push({
    x0: -X,
    x1: 0,
    z0: Z_LAND_FRONT - 0.06,
    z1: Z_LAND_FRONT + 0.06,
    y0: topY - 0.1,
    y1: topY + 1.0,
  });

  // Ограждения тех же двух открытых краёв.
  b.box('guard-rail', [FLIGHT_W, 0.06, 0.05], [FLIGHT_CX, 0.95, Z_LAND_FRONT], 'metal');
  b.box('guard-post', [0.05, 0.95, 0.05], [FLIGHT_INNER + 0.02, 0.475, Z_LAND_FRONT], 'metal');
  b.box('guard-post', [0.05, 0.95, 0.05], [FLIGHT_OUTER - 0.02, 0.475, Z_LAND_FRONT], 'metal');

  b.box('guard-rail', [FLIGHT_W, 0.06, 0.05], [-FLIGHT_CX, topY + 0.95, Z_LAND_FRONT], 'metal');
  b.box('guard-post', [0.05, 0.95, 0.05], [-FLIGHT_INNER - 0.02, topY + 0.475, Z_LAND_FRONT], 'metal');
  b.box('guard-post', [0.05, 0.95, 0.05], [-FLIGHT_OUTER + 0.02, topY + 0.475, Z_LAND_FRONT], 'metal');

  // — почтовые ящики на первом этаже —
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 2; col++) {
      b.box(
        'mailbox',
        [0.32, 0.26, 0.12],
        [-1.4 + col * 0.36, 1.25 + row * 0.3, Z_FRONT - 0.14],
        'metal',
      );
    }
  }

  // — свет: по лампе через три этажа, чтобы шахта не была чёрной —
  for (const k of [0, 3, 6, 8]) {
    b.lamp([0, k * H + 2.55, Z_FRONT - 0.9], new Color3(1, 0.86, 0.62), 5, 8.5);
  }

  // — сосед с третьего этажа —
  makePerson(scene, b.root, -0.7, 2 * H, 1.9, 0.7, {
    hunched: true,
    coat: new Color3(0.3, 0.29, 0.27),
  });

  return {
    id: 'stairwell',
    title: 'Подъезд',
    root: b.root,
    col: b.col,
    spawn: { x: 0, y: 8 * H, z: 2.35, yaw: Math.PI },
    ambientC: -5,
    outdoors: false,
    spots: [
      { id: 'stair.flat-door', position: [0, 8 * H + 1.2, Z_FRONT - 0.45], radius: 1.3, label: 'Дверь квартиры', kind: 'door', target: 'flat' },
      { id: 'stair.street-door', position: [0, 1.2, Z_FRONT - 0.45], radius: 1.4, label: 'Выйти во двор', kind: 'door', target: 'street' },
      { id: 'stair.mailboxes', position: [-1.2, 1.55, Z_FRONT - 0.3], radius: 1.2, label: 'Почтовые ящики', kind: 'loot' },
      { id: 'stair.lift', position: [1.25, 1.05, Z_LAND_FRONT + 1.0], radius: 1.1, label: 'Лифт', kind: 'examine' },
      { id: 'stair.window', position: [X - 0.45, HALF + 1.6, (Z_BACK + Z_LAND_BACK) / 2], radius: 1.3, label: 'Окно на лестнице', kind: 'examine' },
      { id: 'stair.neighbor', position: [-0.7, 2 * H + 1.3, 1.9], radius: 2.2, label: 'Сосед', kind: 'npc' },
    ],
  };
}
