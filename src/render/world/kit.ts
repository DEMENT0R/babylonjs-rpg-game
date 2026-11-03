import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { PointLight } from '@babylonjs/core/Lights/pointLight';
import type { Scene } from '@babylonjs/core/scene';
import type { TextureLibrary } from '../textures';
import { emptyCollision, type LevelCollision } from '../collision';

export type MatKind =
  | 'concrete'
  | 'concreteDark'
  | 'stair'
  | 'wallpaper'
  | 'linoleum'
  | 'tile'
  | 'wood'
  | 'metal'
  | 'door'
  | 'snow'
  | 'asphalt'
  | 'glass'
  | 'ice';

/** Набор материалов и примитивов для сборки локаций из коробок. */
export class Kit {
  private mats = new Map<string, StandardMaterial>();

  constructor(
    private scene: Scene,
    private tex: TextureLibrary,
  ) {}

  mat(kind: MatKind): StandardMaterial {
    const hit = this.mats.get(kind);
    if (hit) return hit;

    const m = new StandardMaterial(`mat:${kind}`, this.scene);
    m.specularColor = new Color3(0.02, 0.02, 0.03);
    m.ambientColor = new Color3(0.3, 0.32, 0.35);
    m.backFaceCulling = true;
    m.maxSimultaneousLights = 8;

    switch (kind) {
      case 'concrete':
        m.diffuseTexture = this.tex.concrete(4, 4);
        m.diffuseColor = new Color3(0.72, 0.74, 0.76);
        break;
      case 'concreteDark':
        m.diffuseTexture = this.tex.concrete(2, 2);
        m.diffuseColor = new Color3(0.4, 0.42, 0.45);
        break;
      case 'stair':
        m.diffuseTexture = this.tex.stairWall(3, 2);
        m.diffuseColor = new Color3(0.78, 0.78, 0.75);
        break;
      case 'wallpaper':
        m.diffuseTexture = this.tex.wallpaper(6, 3);
        m.diffuseColor = new Color3(0.82, 0.8, 0.76);
        break;
      case 'linoleum':
        m.diffuseTexture = this.tex.linoleum(6, 6);
        m.diffuseColor = new Color3(0.8, 0.78, 0.74);
        break;
      case 'tile':
        m.diffuseTexture = this.tex.tile(6, 6);
        m.diffuseColor = new Color3(0.8, 0.82, 0.84);
        break;
      case 'wood':
        m.diffuseTexture = this.tex.wood(1, 1);
        m.diffuseColor = new Color3(0.75, 0.7, 0.64);
        break;
      case 'metal':
        m.diffuseTexture = this.tex.metal(1, 1);
        m.diffuseColor = new Color3(0.7, 0.72, 0.75);
        m.specularColor = new Color3(0.16, 0.17, 0.18);
        break;
      case 'door':
        m.diffuseTexture = this.tex.door(1, 1);
        m.diffuseColor = new Color3(0.8, 0.76, 0.72);
        break;
      case 'snow':
        m.diffuseTexture = this.tex.snow(8, 8);
        m.diffuseColor = new Color3(0.94, 0.97, 1);
        m.emissiveColor = new Color3(0.06, 0.07, 0.09);
        m.specularColor = new Color3(0.12, 0.14, 0.16);
        break;
      case 'asphalt':
        m.diffuseTexture = this.tex.asphalt(6, 6);
        m.diffuseColor = new Color3(0.6, 0.62, 0.65);
        break;
      case 'glass':
        m.diffuseTexture = this.tex.glass();
        m.emissiveColor = new Color3(0.05, 0.07, 0.09);
        m.specularColor = new Color3(0.3, 0.34, 0.38);
        break;
      case 'ice':
        m.diffuseTexture = this.tex.snow(2, 2);
        m.diffuseColor = new Color3(0.7, 0.8, 0.88);
        m.specularColor = new Color3(0.35, 0.4, 0.45);
        break;
    }
    this.mats.set(kind, m);
    return m;
  }

  /** Светящееся окно: единственный источник дневного света в комнате. */
  windowLight(): StandardMaterial {
    const key = 'window-light';
    const hit = this.mats.get(key);
    if (hit) return hit;
    const m = new StandardMaterial(key, this.scene);
    m.disableLighting = true;
    m.emissiveColor = new Color3(0.5, 0.55, 0.6);
    m.diffuseColor = new Color3(0, 0, 0);
    m.specularColor = new Color3(0, 0, 0);
    m.backFaceCulling = false;
    this.mats.set(key, m);
    return m;
  }

  /** Материал фасада с точным тайлингом под размер стены. */
  facade(seed: number, w: number, h: number): StandardMaterial {
    const key = `facade:${seed}:${Math.round(w)}:${Math.round(h)}`;
    const hit = this.mats.get(key);
    if (hit) return hit;
    const m = new StandardMaterial(key, this.scene);
    m.diffuseTexture = this.tex.facade(seed, Math.max(1, w / 12), Math.max(1, h / 12));
    m.specularColor = new Color3(0.03, 0.03, 0.04);
    m.ambientColor = new Color3(0.32, 0.34, 0.37);
    this.mats.set(key, m);
    return m;
  }
}

export interface BoxOpts {
  collide?: boolean;
  material?: StandardMaterial;
  parent?: TransformNode;
  /** Только визуал: без теней и пикинга. */
  thin?: boolean;
}

/** Строитель локации: копит меши и коллайдеры в одном месте. */
export class LevelBuilder {
  readonly root: TransformNode;
  readonly col: LevelCollision = emptyCollision();
  readonly blockers: Mesh[] = [];

  constructor(
    private scene: Scene,
    readonly kit: Kit,
    name: string,
  ) {
    this.root = new TransformNode(name, scene);
  }

  box(
    name: string,
    size: [number, number, number],
    center: [number, number, number],
    kind?: MatKind,
    opts: BoxOpts = {},
  ): Mesh {
    const mesh = MeshBuilder.CreateBox(
      name,
      { width: size[0], height: size[1], depth: size[2] },
      this.scene,
    );
    mesh.position.set(center[0], center[1], center[2]);
    mesh.material = opts.material ?? (kind ? this.kit.mat(kind) : null);
    mesh.parent = opts.parent ?? this.root;
    mesh.isPickable = false;
    return mesh;
  }

  /** Стена вдоль оси X (фиксированный z). */
  wallX(
    x0: number,
    x1: number,
    z: number,
    y0: number,
    y1: number,
    kind: MatKind,
    thickness = 0.18,
  ): Mesh {
    const w = Math.abs(x1 - x0);
    const h = Math.abs(y1 - y0);
    const mesh = this.box(
      'wall',
      [w, h, thickness],
      [(x0 + x1) / 2, (y0 + y1) / 2, z],
      kind,
    );
    this.col.walls.push({
      x0: Math.min(x0, x1),
      x1: Math.max(x0, x1),
      z0: z - thickness / 2,
      z1: z + thickness / 2,
    });
    return mesh;
  }

  /** Стена вдоль оси Z. */
  wallZ(
    z0: number,
    z1: number,
    x: number,
    y0: number,
    y1: number,
    kind: MatKind,
    thickness = 0.18,
  ): Mesh {
    const d = Math.abs(z1 - z0);
    const h = Math.abs(y1 - y0);
    const mesh = this.box(
      'wall',
      [thickness, h, d],
      [x, (y0 + y1) / 2, (z0 + z1) / 2],
      kind,
    );
    this.col.walls.push({
      x0: x - thickness / 2,
      x1: x + thickness / 2,
      z0: Math.min(z0, z1),
      z1: Math.max(z0, z1),
    });
    return mesh;
  }

  /** Стена с проёмом: две колонны и перемычка. Коллайдер только у колонн. */
  wallXwithDoor(
    x0: number,
    x1: number,
    z: number,
    y0: number,
    y1: number,
    doorX0: number,
    doorX1: number,
    doorTop: number,
    kind: MatKind,
    thickness = 0.18,
  ): void {
    if (doorX0 > x0) this.wallX(x0, doorX0, z, y0, y1, kind, thickness);
    if (x1 > doorX1) this.wallX(doorX1, x1, z, y0, y1, kind, thickness);
    if (doorTop < y1) {
      this.box(
        'lintel',
        [Math.abs(doorX1 - doorX0), Math.abs(y1 - doorTop), thickness],
        [(doorX0 + doorX1) / 2, (doorTop + y1) / 2, z],
        kind,
      );
    }
  }

  wallZwithDoor(
    z0: number,
    z1: number,
    x: number,
    y0: number,
    y1: number,
    doorZ0: number,
    doorZ1: number,
    doorTop: number,
    kind: MatKind,
    thickness = 0.18,
  ): void {
    if (doorZ0 > z0) this.wallZ(z0, doorZ0, x, y0, y1, kind, thickness);
    if (z1 > doorZ1) this.wallZ(doorZ1, z1, x, y0, y1, kind, thickness);
    if (doorTop < y1) {
      this.box(
        'lintel',
        [thickness, Math.abs(y1 - doorTop), Math.abs(doorZ1 - doorZ0)],
        [x, (doorTop + y1) / 2, (doorZ0 + doorZ1) / 2],
        kind,
      );
    }
  }

  floor(x0: number, z0: number, x1: number, z1: number, y: number, kind: MatKind): Mesh {
    const mesh = this.box(
      'floor',
      [Math.abs(x1 - x0), 0.12, Math.abs(z1 - z0)],
      [(x0 + x1) / 2, y - 0.06, (z0 + z1) / 2],
      kind,
    );
    this.col.floors.push({
      x0: Math.min(x0, x1),
      x1: Math.max(x0, x1),
      z0: Math.min(z0, z1),
      z1: Math.max(z0, z1),
      y,
    });
    return mesh;
  }

  ceiling(x0: number, z0: number, x1: number, z1: number, y: number, kind: MatKind): Mesh {
    return this.box(
      'ceiling',
      [Math.abs(x1 - x0), 0.12, Math.abs(z1 - z0)],
      [(x0 + x1) / 2, y + 0.06, (z0 + z1) / 2],
      kind,
    );
  }

  ramp(
    x0: number,
    z0: number,
    x1: number,
    z1: number,
    y0: number,
    y1: number,
    axis: 'x' | 'z',
  ): void {
    this.col.ramps.push({
      x0: Math.min(x0, x1),
      x1: Math.max(x0, x1),
      z0: Math.min(z0, z1),
      z1: Math.max(z0, z1),
      y0,
      y1,
      axis,
    });
  }

  /** Источник света: маленькая эмиссивная сфера + точка. */
  lamp(
    position: [number, number, number],
    color: Color3,
    intensity: number,
    range: number,
  ): void {
    const bulb = MeshBuilder.CreateSphere('bulb', { diameter: 0.14, segments: 6 }, this.scene);
    bulb.position.set(position[0], position[1], position[2]);
    bulb.parent = this.root;
    bulb.isPickable = false;
    const m = new StandardMaterial('bulb-mat', this.scene);
    m.emissiveColor = color;
    m.disableLighting = true;
    bulb.material = m;
    const light = new PointLight(
      `lamp:${position.join(',')}`,
      new Vector3(position[0], position[1], position[2]),
      this.scene,
    );
    light.diffuse = color;
    light.specular = color;
    light.intensity = intensity;
    light.range = range;
  }
}
