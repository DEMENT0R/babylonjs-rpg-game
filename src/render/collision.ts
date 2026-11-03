import type { Vector3 } from '@babylonjs/core/Maths/math.vector';

export interface Rect2 {
  x0: number;
  z0: number;
  x1: number;
  z1: number;
}

export interface FloorRect extends Rect2 {
  y: number;
}

export interface RampRect extends Rect2 {
  y0: number;
  y1: number;
  axis: 'x' | 'z';
}

export interface LevelCollision {
  walls: Rect2[];
  floors: FloorRect[];
  ramps: RampRect[];
}

export const PLAYER_RADIUS = 0.3;
export const EYE_HEIGHT = 1.62;

export function emptyCollision(): LevelCollision {
  return { walls: [], floors: [], ramps: [] };
}

function pushOut(x: number, z: number, rect: Rect2, radius: number): { x: number; z: number } | null {
  const ex0 = rect.x0 - radius;
  const ex1 = rect.x1 + radius;
  const ez0 = rect.z0 - radius;
  const ez1 = rect.z1 + radius;
  if (x <= ex0 || x >= ex1 || z <= ez0 || z >= ez1) return null;

  const dl = x - ex0;
  const dr = ex1 - x;
  const dt = z - ez0;
  const db = ez1 - z;
  const min = Math.min(dl, dr, dt, db);

  if (min === dl) return { x: ex0, z };
  if (min === dr) return { x: ex1, z };
  if (min === dt) return { x, z: ez0 };
  return { x, z: ez1 };
}

/** Разрешение столкновений круга с прямоугольниками: дёшево и предсказуемо. */
export function resolvePosition(
  x: number,
  z: number,
  col: LevelCollision,
  radius = PLAYER_RADIUS,
): { x: number; z: number } {
  let px = x;
  let pz = z;
  for (let pass = 0; pass < 3; pass++) {
    let moved = false;
    for (const wall of col.walls) {
      const res = pushOut(px, pz, wall, radius);
      if (res) {
        px = res.x;
        pz = res.z;
        moved = true;
      }
    }
    if (!moved) break;
  }
  return { x: px, z: pz };
}

export function pointBlocked(x: number, z: number, col: LevelCollision): boolean {
  for (const w of col.walls) {
    if (x > w.x0 && x < w.x1 && z > w.z0 && z < w.z1) return true;
  }
  return false;
}

/** Высота пола под точкой: сначала площадки, потом пандусы. */
export function floorHeightAt(
  x: number,
  z: number,
  col: LevelCollision,
  fallback: number,
): number {
  let best = fallback;
  let found = false;
  for (const f of col.floors) {
    if (x >= f.x0 && x <= f.x1 && z >= f.z0 && z <= f.z1) {
      if (!found || Math.abs(f.y - fallback) < Math.abs(best - fallback)) {
        best = f.y;
        found = true;
      }
    }
  }
  if (found) return best;
  for (const r of col.ramps) {
    if (x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1) {
      const t =
        r.axis === 'x'
          ? (x - r.x0) / Math.max(r.x1 - r.x0, 0.0001)
          : (z - r.z0) / Math.max(r.z1 - r.z0, 0.0001);
      return r.y0 + (r.y1 - r.y0) * Math.min(Math.max(t, 0), 1);
    }
  }
  return best;
}

export interface MoveResult {
  position: Vector3;
  blocked: boolean;
}

/** Скольжение вдоль стен: пробуем полный шаг, потом по осям. */
export function slideMove(
  pos: Vector3,
  dx: number,
  dz: number,
  col: LevelCollision,
  radius = PLAYER_RADIUS,
): { x: number; z: number } {
  const full = resolvePosition(pos.x + dx, pos.z + dz, col, radius);
  const movedX = Math.abs(full.x - pos.x);
  const movedZ = Math.abs(full.z - pos.z);

  if (movedX < Math.abs(dx) * 0.5 || movedZ < Math.abs(dz) * 0.5) {
    // упёрлись — пробуем оси отдельно, чтобы не залипать в углах
    const onlyX = resolvePosition(pos.x + dx, pos.z, col, radius);
    const onlyZ = resolvePosition(pos.x, pos.z + dz, col, radius);
    const cX = Math.abs(onlyX.x - pos.x) + Math.abs(onlyX.z - pos.z);
    const cZ = Math.abs(onlyZ.x - pos.x) + Math.abs(onlyZ.z - pos.z);
    return cX > cZ ? onlyX : onlyZ;
  }
  return full;
}
