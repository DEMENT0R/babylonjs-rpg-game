import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Axis } from '@babylonjs/core/Maths/math.axis';
import type { UniversalCamera } from '@babylonjs/core/Cameras/universalCamera';
import { floorHeightAt, slideMove, PLAYER_RADIUS, type LevelCollision } from '../render/collision';

export interface ControllerHost {
  getCollision(): LevelCollision;
  isLocked(): boolean;
  getEncumbrance(): number;
}

const WALK = 2.7;
const RUN = 4.6;
const SENSITIVITY = 0.0021;

/** Первое лицо: мышь, WASD, скольжение вдоль стен, подъём по лестнице. */
export class FirstPersonController {
  position = new Vector3(0, 0, 0);
  yaw = 0;
  pitch = 0;
  enabled = true;

  private keys = new Set<string>();
  private bobPhase = 0;
  private bobAmount = 0;
  private currentFloor = 0;
  private stepAccum = 0;

  onStep: (() => void) | null = null;
  onInteract: (() => void) | null = null;

  constructor(
    private canvas: HTMLCanvasElement,
    private camera: UniversalCamera,
    private host: ControllerHost,
  ) {
    this.bind();
  }

  private bind(): void {
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      this.keys.add(e.code);
      if (e.code === 'KeyE') this.onInteract?.();
      if (e.code === 'Escape') document.exitPointerLock();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());

    this.canvas.addEventListener('click', () => {
      if (this.enabled && !this.host.isLocked()) this.canvas.requestPointerLock();
    });
    document.addEventListener('mousemove', (e) => {
      if (!this.host.isLocked() || !this.enabled) return;
      this.yaw -= e.movementX * SENSITIVITY;
      this.pitch -= e.movementY * SENSITIVITY;
      this.pitch = Math.max(-1.35, Math.min(1.35, this.pitch));
    });
  }

  teleport(x: number, y: number, z: number, yaw: number): void {
    this.position.set(x, y, z);
    this.currentFloor = y;
    this.yaw = yaw;
    this.pitch = 0;
    this.applyCamera(0);
  }

  private get locked(): boolean {
    return this.host.isLocked();
  }

  update(dt: number): void {
    const col = this.host.getCollision();
    let dx = 0;
    let dz = 0;

    if (this.enabled && this.locked) {
      const forward = (this.keys.has('KeyW') ? 1 : 0) - (this.keys.has('KeyS') ? 1 : 0);
      const strafe = (this.keys.has('KeyD') ? 1 : 0) - (this.keys.has('KeyA') ? 1 : 0);
      const running = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight');
      const speed = (running ? RUN : WALK) * (1 - this.host.getEncumbrance());

      if (forward !== 0 || strafe !== 0) {
        // направления берём у самой камеры — не зависит от соглашений Babylon
        const f = this.camera.getDirection(Axis.Z);
        f.y = 0;
        f.normalize();
        const r = this.camera.getDirection(Axis.X);
        r.y = 0;
        r.normalize();

        dx = (f.x * forward + r.x * strafe) * speed * dt;
        dz = (f.z * forward + r.z * strafe) * speed * dt;
      }
    }

    if (dx !== 0 || dz !== 0) {
      const next = slideMove(this.position, dx, dz, col, PLAYER_RADIUS);
      const moved = Math.hypot(next.x - this.position.x, next.z - this.position.z);
      this.position.x = next.x;
      this.position.z = next.z;

      this.bobPhase += moved * 2.4;
      this.bobAmount = Math.min(1, this.bobAmount + moved * 6);
      this.stepAccum += moved;
      if (this.stepAccum > 0.85) {
        this.stepAccum = 0;
        this.onStep?.();
      }
    } else {
      this.bobAmount = Math.max(0, this.bobAmount - dt * 3);
    }

    const targetFloor = floorHeightAt(this.position.x, this.position.z, col, this.currentFloor);
    this.currentFloor += (targetFloor - this.currentFloor) * Math.min(1, dt * 12);
    this.position.y = this.currentFloor;

    this.applyCamera(dt);
  }

  private applyCamera(dt: number): void {
    void dt;
    const bob = Math.sin(this.bobPhase * 2) * 0.035 * this.bobAmount;
    const sway = Math.cos(this.bobPhase) * 0.02 * this.bobAmount;
    this.camera.position.set(
      this.position.x + sway * 0.4,
      this.position.y + 1.62 + bob,
      this.position.z,
    );
    this.camera.rotation.set(this.pitch, this.yaw, Math.cos(this.bobPhase) * 0.006 * this.bobAmount);
  }

  get isMoving(): boolean {
    return this.bobAmount > 0.05;
  }
}
