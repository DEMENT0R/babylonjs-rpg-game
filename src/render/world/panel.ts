import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import type { PanelPalette } from '../textures';
import { Kit, LevelBuilder } from './kit';

/** Типовые панельки — от пяти до девяти этажей; всё, что вне диапазона, уже не серия. */
export const PANEL_FLOORS_MIN = 5;
export const PANEL_FLOORS_MAX = 9;
export type PanelFloors = 5 | 6 | 7 | 8 | 9;

/**
 * Типовая серия. Планировка секции задана один раз и повторяется на каждом
 * этаже: те же окна, тот же балкон, та же шахта подъезда — друг над другом.
 */
export interface PanelSeries {
  id: string;
  title: string;
  floors: PanelFloors;
  /** Высота этажа, м: от пола до пола. */
  floorHeight: number;
  /** Ширина одной секции с четырьмя осями окон. */
  sectionWidth: number;
  /** Глубина корпуса, м. */
  depth: number;
  palette: PanelPalette;
}

export const PANEL_SERIES = {
  '1-464': {
    id: '1-464',
    title: 'пятиэтажка 1-464',
    floors: 5,
    floorHeight: 2.7,
    sectionWidth: 12,
    depth: 11,
    palette: {
      id: '1-464',
      base: '#8c8474',
      seam: '#454139',
      sill: '#b8b2a4',
      frame: '#cfc9bb',
    },
  },
  'panel-7': {
    id: 'panel-7',
    title: 'семиэтажная панель',
    floors: 7,
    floorHeight: 2.8,
    sectionWidth: 12,
    depth: 11.6,
    palette: {
      id: 'panel-7',
      base: '#82867c',
      seam: '#3e423b',
      sill: '#b7bbae',
      frame: '#c9cec0',
    },
  },
  '1-515': {
    id: '1-515',
    title: 'девятиэтажка 1-515/9',
    floors: 9,
    floorHeight: 2.8,
    sectionWidth: 12,
    depth: 12,
    palette: {
      id: '1-515',
      base: '#7d8287',
      seam: '#3b4044',
      sill: '#b3bac0',
      frame: '#c6cdd3',
    },
  },
} as const satisfies Record<string, PanelSeries>;

export interface PanelHouseSpec {
  series: PanelSeries;
  sections: number;
  /** Отдельный seed: одинаковая серия, но разный рисунок бетона и света в окнах. */
  seed: number;
  /** Центр корпуса в мировых координатах. */
  x: number;
  z: number;
  /** Поворот вокруг Y; фасад смотрит в локальную +Z. */
  yaw?: number;
  balconies?: boolean;
  /** По умолчанию подъезд в каждой секции. */
  entrances?: 'all' | number[];
}

/**
 * Собирает типовой панельный дом: корпус, фасад с окнами этаж в этаж,
 * балконы, подъезды, парапет и надстройку лифта. Коллайдер — один AABB.
 */
export function panelHouse(b: LevelBuilder, kit: Kit, spec: PanelHouseSpec): void {
  const { series, sections, seed, x, z, yaw = 0 } = spec;
  const floors = series.floors;

  // Страховка на случай, если серию опишут неверно.
  if (floors < PANEL_FLOORS_MIN || floors > PANEL_FLOORS_MAX) {
    throw new Error(`Панелька вне диапазона 5–9 этажей: ${series.id} — ${floors}`);
  }

  const length = sections * series.sectionWidth;
  const depth = series.depth;
  const height = floors * series.floorHeight;
  const halfL = length / 2;
  const halfD = depth / 2;

  const root = new TransformNode(`panel:${series.id}:${seed}`, b.root.getScene());
  root.parent = b.root;
  root.position.set(x, 0, z);
  root.rotation.y = yaw;

  // Корпус: торцы остаются глухими, поэтому окна живут на отдельных плоскостях.
  b.box('panel-body', [length, height, depth], [0, height / 2, 0], undefined, {
    parent: root,
    material: kit.mat('concrete'),
  });

  const facade = kit.panelFacade(seed, sections, floors, series.floorHeight, series.palette);
  b.box('panel-facade', [length, height, 0.12], [0, height / 2, halfD + 0.06], undefined, {
    parent: root,
    material: facade,
  });
  b.box('panel-facade', [length, height, 0.12], [0, height / 2, -halfD - 0.06], undefined, {
    parent: root,
    material: facade,
  });

  // Крыша: плита, парапет, вентстояки и машинное отделение лифта.
  const roofY = height + 0.24;
  b.box('panel-roof', [length + 0.22, 0.24, depth + 0.22], [0, height + 0.12, 0], 'concreteDark', {
    parent: root,
  });
  for (const zz of [-halfD - 0.05, halfD + 0.05]) {
    b.box('panel-parapet', [length + 0.22, 0.56, 0.22], [0, height + 0.52, zz], 'concreteDark', {
      parent: root,
    });
  }
  for (const xx of [-halfL - 0.05, halfL + 0.05]) {
    b.box('panel-parapet', [0.22, 0.56, depth + 0.22], [xx, height + 0.52, 0], 'concreteDark', {
      parent: root,
    });
  }

  for (let i = 0; i < 2; i++) {
    const vent = MeshBuilder.CreateCylinder(
      'panel-vent',
      { height: 0.9, diameter: 0.42, tessellation: 8 },
      b.root.getScene(),
    );
    vent.position.set(
      -halfL + 3 + i * (length - 6),
      roofY + 0.45,
      i === 0 ? -depth * 0.22 : depth * 0.22,
    );
    vent.material = kit.mat('metal');
    vent.parent = root;
    vent.isPickable = false;
  }

  if (floors >= 9) {
    b.box('panel-lift-room', [4.2, 2.2, 3.4], [halfL - 5, roofY + 1.1, 0], 'concreteDark', {
      parent: root,
    });
    b.box('panel-lift-cap', [4.4, 0.16, 3.6], [halfL - 5, roofY + 2.28, 0], 'metal', {
      parent: root,
    });
  }

  // Балконы на одном и том же месте каждого этажа — главный признак типового дома.
  if (spec.balconies !== false) {
    for (let s = 0; s < sections; s++) {
      const cx = -halfL + s * series.sectionWidth + 4.35;
      for (let f = 1; f < floors; f++) {
        const y = f * series.floorHeight;
        b.box('balcony-slab', [2.35, 0.14, 0.95], [cx, y - 0.07, halfD + 0.475], 'concrete', {
          parent: root,
        });
        b.box('balcony-rail', [2.35, 0.92, 0.05], [cx, y + 0.46, halfD + 0.93], 'metal', {
          parent: root,
        });
        b.box('balcony-snow', [2.22, 0.04, 0.82], [cx, y + 0.02, halfD + 0.5], 'snow', {
          parent: root,
        });
      }
    }
  }

  // Подъезды: козырёк, дверь, крыльцо. Текстура оставляет для них проём.
  const entranceSections =
    spec.entrances === undefined || spec.entrances === 'all'
      ? Array.from({ length: sections }, (_, i) => i)
      : spec.entrances;
  for (const s of entranceSections) {
    const cx = -halfL + (s + 0.5) * series.sectionWidth;
    b.box('entry-step', [2.2, 0.16, 0.9], [cx, 0.08, halfD + 0.45], 'concrete', { parent: root });
    b.box('entry-frame', [1.6, 2.3, 0.08], [cx, 1.15, halfD + 0.07], 'metal', { parent: root });
    b.box('entry-door', [1.35, 2.1, 0.1], [cx, 1.05, halfD + 0.13], 'door', { parent: root });
    b.box('entry-canopy', [2.8, 0.14, 1.3], [cx, 2.55, halfD + 0.65], 'concreteDark', {
      parent: root,
    });
    for (const side of [-1, 1]) {
      b.box('entry-post', [0.1, 2.48, 0.1], [cx + side * 1.2, 1.24, halfD + 1.15], 'metal', {
        parent: root,
      });
    }
  }

  // Коллайдер — повёрнутый на 90° корпус остаётся прямоугольником.
  const cos = Math.abs(Math.cos(yaw));
  const sin = Math.abs(Math.sin(yaw));
  const hx = (length * cos + depth * sin) / 2;
  const hz = (length * sin + depth * cos) / 2;
  b.col.walls.push({ x0: x - hx, x1: x + hx, z0: z - hz, z1: z + hz });
}
